defmodule DragnCardsGame.Evaluate.Functions.CURRENT_TIME do
  @moduledoc """
  *Arguments*:
  none
  Returns the current time in milliseconds since the epoch (January 1, 1970).
  *Returns*:
  (number) The current time in milliseconds since the epoch.
  """
  @doc """
  Executes the 'CURRENT_TIME' operation with the given arguments.
  ## Parameters

    - `args`: The arguments required for the 'CURRENT_TIME' operation.
  ## Returns
  The result of the 'CURRENT_TIME' operation.
  """
  def execute(_game, _code, _trace) do
    :os.system_time(:millisecond)
  end
end
