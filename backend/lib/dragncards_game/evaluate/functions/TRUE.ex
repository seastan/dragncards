defmodule DragnCardsGame.Evaluate.Functions.TRUE do
  @moduledoc """
  *Arguments*:
  None

  *Returns*:
  `true`

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
  Executes the 'TRUE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'TRUE' operation.

  ## Returns

  The result of the 'TRUE' operation.
  """
  def execute(_game, _code, _trace) do
    true
  end


end
