defmodule DragnCards.Users.User do
  @moduledoc """
  Represents a user of the system.
  Managed by the "pow" library.
  """
  use Ecto.Schema
  @timestamps_opts [type: :utc_datetime]
  use Pow.Ecto.Schema
  alias DragnCards.Users.User
  alias DragnCardsUtil.Merger

  use Pow.Extension.Ecto.Schema,
    extensions: [PowResetPassword, PowEmailConfirmation]

  schema "users" do
    pow_user_fields()
    field(:alias, :string)
    field(:admin, :boolean, default: false)
    field(:supporter_level, :integer)
    field(:language, :string, default: "English")
    field(:plugin_settings, :map, default: %{})
    timestamps()
  end

  def changeset(user_or_changeset, attrs) do
    if attrs == %{} do
      user_or_changeset
      |> pow_user_id_field_changeset(attrs)
      |> pow_password_changeset(attrs)
    else
      user_or_changeset
      |> pow_changeset(attrs)
      |> pow_extension_changeset(attrs)
      |> Ecto.Changeset.cast(attrs, [:alias])
      |> Ecto.Changeset.validate_required([:alias])
      |> Ecto.Changeset.unique_constraint(:alias)
    end
  end

  @doc """
  to_my_profile/1:
  Given a User object, return a UserProfile map that's delivered
  to the front end via the Profile controller.
  This way, we can customize what fields we send to the frontend.
  This is called a "Profile" in the JS backend (private info about you.)
  """
  def to_my_profile(%User{} = user) do
    %{
      id: user.id,
      alias: user.alias,
      admin: user.admin,
      email: user.email,
      inserted_at: user.inserted_at,
      email_confirmed_at: user.email_confirmed_at,
      supporter_level: user.supporter_level,
      language: user.language,
      plugin_settings: user.plugin_settings
    }
  end

  @doc """
  to_public_profile/1:
  Public profile: If getting info about another user, you shouldn't
  be able to see their emails and such
  This is called a "User" in the JS backend (public info about seomeone else.)
  """
  def to_public_profile(%User{} = user) do
    %{
      id: user.id,
      alias: user.alias
    }
  end

  def settings_update(user, nested_map) do
    plugin_settings_old = user.plugin_settings || %{}
    plugin_settings_new = Merger.deep_merge([plugin_settings_old, nested_map])
    %{plugin_settings: plugin_settings_new}
  end

end
