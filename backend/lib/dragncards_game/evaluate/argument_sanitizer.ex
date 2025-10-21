defmodule DragnCardsGame.Evaluate.ArgumentSanitizer do
  @moduledoc """
  Provides argument validation for game evaluation functions.
  """

  alias DragnCardsGame.Evaluate

  @doc """
  Validates a list of arguments based on their expected types.

  ## Parameters

    - `function_name`: The name of the function being validated (string)
    - `game`: The current game state
    - `args`: A list of tuples in the format `{name, value, type}`
      where:
      - `name` is the argument name (string)
      - `value` is the argument value to validate
      - `type` is one of: `:player`, `:group`, `:integer`, `:boolean`, `:string`, `:number`, `:list`, `:map`

  ## Returns

  Returns `:ok` if all validations pass.

  ## Raises

  Raises an error if any validation fails.

  ## Examples

      iex> sanitize_args("LOOK_AT", game, [
      ...>   {"playerI", "player1", :player},
      ...>   {"groupId", "deck", :group},
      ...>   {"topN", 5, :integer},
      ...>   {"visibility", true, :boolean}
      ...> ])
      :ok

  """
  def sanitize_args(function_name, game, args) when is_list(args) do
    Enum.each(args, fn {name, value, type} ->
      validate_arg(function_name, game, name, value, type)
    end)
    :ok
  end

  defp valid_player?(game, player_i) do
    player_i in Map.keys(game["playerData"] || %{})
  end

  defp validate_arg(function_name, game, name, value, :player) do
    if !valid_player?(game, value) do
      raise "#{function_name} expected a player ID for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, game, name, value, :group) do
    if !Map.has_key?(game["groupById"], value) do
      raise "#{function_name} expected a group for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :integer) do
    if !is_integer(value) do
      raise "#{function_name} expected an integer for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :boolean) do
    if !is_boolean(value) do
      raise "#{function_name} expected a boolean for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :string) do
    if !is_binary(value) do
      raise "#{function_name} expected a string for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :number) do
    if !is_number(value) do
      raise "#{function_name} expected a number for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :list) do
    if !is_list(value) do
      raise "#{function_name} expected a list for argument #{name}. Got #{inspect(value)} instead."
    end
  end

  defp validate_arg(function_name, _game, name, value, :map) do
    if !is_map(value) do
      raise "#{function_name} expected a map for argument #{name}. Got #{inspect(value)} instead."
    end
  end
end
