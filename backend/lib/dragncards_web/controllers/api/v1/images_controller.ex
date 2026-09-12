defmodule DragnCardsWeb.API.V1.ImagesController do
  @moduledoc """
  Plugin image hosting endpoints.

  Every action is scoped to the caller: the routes sit behind `:api_protected`,
  so `Pow.Plug.current_user/1` is always present, and every id and path is
  resolved through `DragnCards.Images` against that user. No caller-supplied
  value can reach another user's tree.
  """
  use DragnCardsWeb, :controller

  alias DragnCards.Images

  action_fallback DragnCardsWeb.FallbackController

  @doc "One directory's images."
  def index(conn, params) do
    user = Pow.Plug.current_user(conn)
    dir = Map.get(params, "dir", "")
    limit = params |> Map.get("limit", "200") |> to_int(200) |> min(1000)
    offset = params |> Map.get("offset", "0") |> to_int(0) |> max(0)

    json(conn, %{
      dir: dir,
      images: Images.list(user.id, dir, limit: limit, offset: offset)
    })
  end

  @doc "The folder tree with rolled-up counts and bytes."
  def tree(conn, _params) do
    user = Pow.Plug.current_user(conn)
    json(conn, Images.tree(user.id))
  end

  @doc "Usage, limits, and whether uploads are currently possible."
  def quota(conn, _params) do
    user = Pow.Plug.current_user(conn)
    json(conn, %{quota: Images.quota_status(user.id)})
  end

  @doc """
  Accepts a batch of files.

  Wire format is `profile`, optional `root`, `count`, then `file_0..file_{n-1}`
  paired with `path_0..path_{n-1}`. Indexed field names rather than `files[]`
  plus `paths[]` because ordering across two separate multipart fields is not
  guaranteed, and a file/path mismatch would be silent and wrong.

  Returns 200 with a per-file result list unless the whole request is refused.
  A forty-file batch containing one bad PNG is not a total loss, and the UI can
  mark exactly the row that failed.
  """
  def upload(conn, %{"profile" => profile, "count" => count} = params) do
    user = Pow.Plug.current_user(conn)
    n = to_int(count, -1)
    max_files = cfg(:max_files_per_request, 40)

    with :ok <- check_count(n, max_files),
         {:ok, _} <- DragnCards.Images.Transcoder.fetch_profile(profile),
         :ok <- Images.check_uploadable() do
      root = Map.get(params, "root", "")

      results =
        0..(n - 1)
        |> Enum.map(&{&1, params["file_#{&1}"], params["path_#{&1}"]})
        # Bounded so one author's folder drop cannot saturate every core and
        # starve the game servers.
        |> Task.async_stream(&ingest_one(user.id, root, profile, &1),
          max_concurrency: 2,
          timeout: 120_000,
          on_timeout: :kill_task,
          ordered: true
        )
        |> Enum.with_index()
        |> Enum.map(fn
          {{:ok, result}, _index} -> result
          {{:exit, _reason}, index} -> error_result(index, nil, "Timed out while processing")
        end)

      json(conn, %{results: results, quota: Images.quota_status(user.id)})
    else
      # Whole-request refusals. Per-file problems never reach here; they come
      # back as entries in `results` with a 200.
      {:error, reason} when reason in [:disk_full, :storage_unavailable] ->
        conn
        |> put_status(507)
        |> json(%{error: %{message: describe(reason)}})

      {:error, :uploads_disabled} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{error: %{message: describe(:uploads_disabled)}})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: %{message: describe(reason)}})
    end
  end

  def upload(conn, _params), do: bad_request(conn, "Missing profile or count.")

  @doc "Deletes images by id, or a whole directory."
  def delete_batch(conn, %{"ids" => ids}) when is_list(ids) do
    user = Pow.Plug.current_user(conn)
    ids = Enum.map(ids, &to_int(&1, -1)) |> Enum.reject(&(&1 < 0))
    {:ok, result} = Images.delete(user.id, ids)
    json(conn, %{deleted: result.deleted, bytes: result.bytes, quota: Images.quota_status(user.id)})
  end

  def delete_batch(conn, %{"dir" => dir}) when is_binary(dir) do
    user = Pow.Plug.current_user(conn)
    {:ok, result} = Images.delete_dir(user.id, dir)
    json(conn, %{deleted: result.deleted, bytes: result.bytes, quota: Images.quota_status(user.id)})
  end

  def delete_batch(conn, _params), do: bad_request(conn, "Provide either ids or dir.")

  @doc "Deletes one image."
  def delete(conn, %{"id" => id}) do
    user = Pow.Plug.current_user(conn)

    case Images.delete(user.id, [to_int(id, -1)]) do
      {:ok, %{deleted: 0}} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})

      {:ok, result} ->
        json(conn, %{
          deleted: result.deleted,
          bytes: result.bytes,
          quota: Images.quota_status(user.id)
        })
    end
  end

  @doc "Moves or renames one image."
  def move(conn, %{"id" => id, "path" => path}) do
    user = Pow.Plug.current_user(conn)

    case Images.move(user.id, to_int(id, -1), path) do
      {:ok, image} ->
        json(conn, %{image: image})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: describe(reason)})
    end
  end

  def move(conn, _params), do: bad_request(conn, "Provide id and path.")

  # --- internals

  defp ingest_one(user_id, root, profile, {index, %Plug.Upload{} = upload, path}) do
    rel = join_root(root, path || upload.filename)

    case Images.ingest(user_id, rel, profile, upload.path, original_filename: upload.filename) do
      {:ok, image} ->
        %{
          index: index,
          path: image.path,
          status: "ok",
          url: image.url,
          bytes: image.bytes,
          width: image.width,
          height: image.height
        }

      {:error, reason} ->
        error_result(index, rel, describe(reason))
    end
  end

  defp ingest_one(_user_id, _root, _profile, {index, _not_an_upload, path}) do
    error_result(index, path, "Missing file data")
  end

  defp error_result(index, path, message),
    do: %{index: index, path: path, status: "error", error: message}

  defp join_root("", path), do: path
  defp join_root(nil, path), do: path
  defp join_root(root, path), do: String.trim_trailing(root, "/") <> "/" <> path

  defp check_count(n, max) when n < 0, do: {:error, {:bad_count, max}}
  defp check_count(0, _max), do: {:error, :empty_batch}
  defp check_count(n, max) when n > max, do: {:error, {:too_many_files, n, max}}
  defp check_count(_n, _max), do: :ok

  # Whole-request refusals. Per-file problems never land here.
  defp bad_request(conn, message),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: %{message: message}})

  defp to_int(value, _default) when is_integer(value), do: value

  defp to_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp to_int(_value, default), do: default

  @doc false
  # Turns internal error terms into something an author can act on.
  def describe(:unsupported_format),
    do: "Unsupported image format. Use PNG, JPEG, GIF or WebP."

  def describe({:file_too_large, size, max}),
    do: "File is #{mb(size)} MB; the limit is #{mb(max)} MB."

  def describe({:too_many_pixels, pixels, max}),
    do: "Image has #{pixels} pixels; the limit is #{max}."

  def describe({:dimension_too_large, w, h}), do: "Image is #{w}x#{h}, which is too large."
  def describe(:bad_dimensions), do: "Image reports invalid dimensions."
  def describe(:empty_file), do: "File is empty."
  def describe(:enoent), do: "File could not be read."
  def describe(:traversal), do: "Path may not contain '..'."
  def describe(:hidden_file), do: "Names may not start with a dot."
  def describe(:nul_byte), do: "Path contains an invalid character."
  def describe(:empty_path), do: "Path is empty."
  def describe(:invalid_path), do: "Path is not valid."
  def describe(:invalid_filename), do: "Filename is not valid."
  def describe(:path_too_long), do: "Path is too long."
  def describe(:segment_too_long), do: "A folder or file name is too long."
  def describe(:trailing_dot), do: "Names may not end with a dot."
  def describe(:trailing_space), do: "Names may not end with a space."
  def describe({:too_deep, depth, max}), do: "Path is #{depth} folders deep; the limit is #{max}."
  def describe({:reserved_name, name}), do: "'#{name}' is a reserved name on Windows."

  def describe({:bad_characters, segment}),
    do: "'#{segment}' contains characters that are not allowed. Use letters, numbers, spaces, dots, dashes and underscores."

  def describe(:unknown_profile), do: "Unknown image profile."
  def describe({:quota_files, used, max}), do: "Image limit reached (#{used} of #{max})."

  def describe({:quota_bytes, used, max}),
    do: "Storage limit reached (#{mb(used)} MB of #{mb(max)} MB)."

  def describe(:transcode_timeout), do: "Timed out while converting the image."
  def describe({:transcode_crashed, _}), do: "The image could not be converted."
  def describe({:transcode_failed, _}), do: "The image could not be converted."
  def describe({:filesystem, _}), do: "The image could not be saved."
  def describe(:uploads_disabled), do: "Image hosting is not configured on this server."
  def describe(:storage_unavailable), do: "Image storage is unavailable."
  def describe(:disk_full), do: "The server is low on disk space; uploads are paused."
  def describe(:empty_batch), do: "No files in the request."
  def describe({:bad_count, _max}), do: "Invalid file count."

  def describe({:too_many_files, n, max}),
    do: "#{n} files in one request; the limit is #{max}."

  def describe(%Ecto.Changeset{}), do: "The image could not be saved."
  def describe(other), do: "Unexpected error: #{inspect(other)}"

  defp mb(bytes), do: Float.round(bytes / 1_048_576, 1)

  defp cfg(key, default),
    do: :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(key, default)
end
