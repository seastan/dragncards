defmodule DragnCards.Settings do
  @moduledoc """
  The Settings context.
  """

  import Ecto.Query, warn: false
  alias DragnCards.Repo

  alias DragnCards.Settings.CardAlt

  @doc """
  Returns the list of card_alts.

  ## Examples

      iex> list_card_alts()
      [%CardAlt{}, ...]

  """
  def list_card_alts do
    Repo.all(CardAlt)
  end

  @doc """
  Gets a single card_alt.

  Raises `Ecto.NoResultsError` if the Card alt does not exist.

  ## Examples

      iex> get_card_alt!(123)
      %CardAlt{}

      iex> get_card_alt!(456)
      ** (Ecto.NoResultsError)

  """
  def get_card_alt!(id), do: Repo.get!(CardAlt, id)

  @doc """
  Creates a card_alt.

  ## Examples

      iex> create_card_alt(%{field: value})
      {:ok, %CardAlt{}}

      iex> create_card_alt(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_card_alt(attrs \\ %{}) do
    %CardAlt{}
    |> CardAlt.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a card_alt.

  ## Examples

      iex> update_card_alt(card_alt, %{field: new_value})
      {:ok, %CardAlt{}}

      iex> update_card_alt(card_alt, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_card_alt(%CardAlt{} = card_alt, attrs) do
    card_alt
    |> CardAlt.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a card_alt.

  ## Examples

      iex> delete_card_alt(card_alt)
      {:ok, %CardAlt{}}

      iex> delete_card_alt(card_alt)
      {:error, %Ecto.Changeset{}}

  """
  def delete_card_alt(%CardAlt{} = card_alt) do
    Repo.delete(card_alt)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking card_alt changes.

  ## Examples

      iex> change_card_alt(card_alt)
      %Ecto.Changeset{data: %CardAlt{}}

  """
  def change_card_alt(%CardAlt{} = card_alt, attrs \\ %{}) do
    CardAlt.changeset(card_alt, attrs)
  end

  alias DragnCards.Settings.CardBackAlt

  @doc """
  Returns the list of card_back_alts.

  ## Examples

      iex> list_card_back_alts()
      [%CardBackAlt{}, ...]

  """
  def list_card_back_alts do
    Repo.all(CardBackAlt)
  end

  @doc """
  Gets a single card_back_alt.

  Raises `Ecto.NoResultsError` if the Card back alt does not exist.

  ## Examples

      iex> get_card_back_alt!(123)
      %CardBackAlt{}

      iex> get_card_back_alt!(456)
      ** (Ecto.NoResultsError)

  """
  def get_card_back_alt!(id), do: Repo.get!(CardBackAlt, id)

  @doc """
  Creates a card_back_alt.

  ## Examples

      iex> create_card_back_alt(%{field: value})
      {:ok, %CardBackAlt{}}

      iex> create_card_back_alt(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_card_back_alt(attrs \\ %{}) do
    %CardBackAlt{}
    |> CardBackAlt.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a card_back_alt.

  ## Examples

      iex> update_card_back_alt(card_back_alt, %{field: new_value})
      {:ok, %CardBackAlt{}}

      iex> update_card_back_alt(card_back_alt, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_card_back_alt(%CardBackAlt{} = card_back_alt, attrs) do
    card_back_alt
    |> CardBackAlt.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a card_back_alt.

  ## Examples

      iex> delete_card_back_alt(card_back_alt)
      {:ok, %CardBackAlt{}}

      iex> delete_card_back_alt(card_back_alt)
      {:error, %Ecto.Changeset{}}

  """
  def delete_card_back_alt(%CardBackAlt{} = card_back_alt) do
    Repo.delete(card_back_alt)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking card_back_alt changes.

  ## Examples

      iex> change_card_back_alt(card_back_alt)
      %Ecto.Changeset{data: %CardBackAlt{}}

  """
  def change_card_back_alt(%CardBackAlt{} = card_back_alt, attrs \\ %{}) do
    CardBackAlt.changeset(card_back_alt, attrs)
  end

  alias DragnCards.Settings.BackgroundAlt

  @doc """
  Returns the list of background_alts.

  ## Examples

      iex> list_background_alts()
      [%BackgroundAlt{}, ...]

  """
  def list_background_alts do
    Repo.all(BackgroundAlt)
  end

  @doc """
  Gets a single background_alts.

  Raises `Ecto.NoResultsError` if the Background alt does not exist.

  ## Examples

      iex> get_background_alts!(123)
      %BackgroundAlt{}

      iex> get_background_alts!(456)
      ** (Ecto.NoResultsError)

  """
  def get_background_alts!(id), do: Repo.get!(BackgroundAlt, id)

  @doc """
  Creates a background_alts.

  ## Examples

      iex> create_background_alts(%{field: value})
      {:ok, %BackgroundAlt{}}

      iex> create_background_alts(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_background_alts(attrs \\ %{}) do
    %BackgroundAlt{}
    |> BackgroundAlt.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a background_alts.

  ## Examples

      iex> update_background_alts(background_alts, %{field: new_value})
      {:ok, %BackgroundAlt{}}

      iex> update_background_alts(background_alts, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_background_alts(%BackgroundAlt{} = background_alts, attrs) do
    background_alts
    |> BackgroundAlt.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a background_alts.

  ## Examples

      iex> delete_background_alts(background_alts)
      {:ok, %BackgroundAlt{}}

      iex> delete_background_alts(background_alts)
      {:error, %Ecto.Changeset{}}

  """
  def delete_background_alts(%BackgroundAlt{} = background_alts) do
    Repo.delete(background_alts)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking background_alts changes.

  ## Examples

      iex> change_background_alts(background_alts)
      %Ecto.Changeset{data: %BackgroundAlt{}}

  """
  def change_background_alts(%BackgroundAlt{} = background_alts, attrs \\ %{}) do
    BackgroundAlt.changeset(background_alts, attrs)
  end
end
