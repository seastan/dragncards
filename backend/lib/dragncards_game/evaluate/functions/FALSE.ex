defmodule DragnCardsGame.Evaluate.Functions.FALSE do
  @moduledoc """
  *Arguments*:
  None

  *Returns*:
  `false`

  *Examples*:

  ```
  ["COND",
    ["FALSE"],
    ["LOG", "This will not get logged"],
    ["TRUE"]
    ["LOG", "This will get logged"]
  ]
  ```
  """

  @doc """
  Executes the 'FALSE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FALSE' operation.

  ## Returns

  The result of the 'FALSE' operation.
  """
  def execute(_game, _code, _trace) do
    false
  end


end
