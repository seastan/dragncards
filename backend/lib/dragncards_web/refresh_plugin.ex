defmodule DragnCardsWeb.RefreshPlugin do
  @moduledoc """
  Handle refreshing the plugin.
  """

  def refresh do
    file_path = "/tmp/plugin_jsons"

    files = fetch_json_files(file_path)
    try do
      files = Enum.map(files, fn file -> process_file(file) end)
      {:ok, files}
    rescue
      error ->
        {:error, error}
    end
  end


  defp fetch_json_files(dir) do
    dir
    |> Path.expand()
    |> File.ls!()
    |> Enum.flat_map(fn file ->
      full_path = Path.join(dir, file)
      if File.dir?(full_path) do
        fetch_json_files(full_path)
      else
        if String.ends_with?(file, ".json"), do: [full_path], else: []
      end
    end)
  end

  defp calculate_line_number(data, position) do
    data
    |> String.slice(0, position)
    |> String.split("\n")
    |> length()
  end

  defp process_file(file_path) do
    case File.read(file_path) do
      {:ok, content} ->
        case Jason.decode(content) do
          {:ok, decoded} -> decoded
          {:error, %Jason.DecodeError{data: data, position: position}} ->
            line_number = calculate_line_number(data, position)
            raise "JSON parsing error in #{file_path} at line #{line_number}\n"
        end
      {:error, reason} ->
        IO.puts("Failed to read file #{file_path}: #{reason}")
    end
  end
end
