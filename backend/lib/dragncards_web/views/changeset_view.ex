defmodule DragnCardsWeb.ChangesetView do
  use DragnCardsWeb, :view

  @doc """
  Traverses and translates changeset errors.

  """
  def translate_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, IO.inspect())
  end

  def render("error.json", %{changeset: changeset}) do
    # When encoded, the changeset returns its errors
    # as a JSON object. So we just pass it forward.
    %{errors: translate_errors(changeset)}
  end
end
