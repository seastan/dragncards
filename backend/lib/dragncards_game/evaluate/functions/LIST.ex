defmodule DragnCardsGame.Evaluate.Functions.LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  Any number of arguments

  In DragnLang, the 'LIST' operation is used to create a list of values. For example:
  ```
  ["VAR", "$MY_LIST", ["LIST", 1, 2, 3]]
  ```
  Will assign the value `[1, 2, 3]` to the variable `$MY_LIST`. The reason we cannot do:
  ```
  ["VAR", "$MY_LIST", [1, 2, 3]]
  ```
  Is because DragnLang is a lisp-like language, and the first element following each `[` is the operation to be performed.
  So this would likely crash because it would attempt to call the function `1` with the arguments `2` and `3` and assign the result to `$MY_LIST`, which is not what we want.

  *Returns*:
  (list) A list containing the results of evaluating each argument.

  *Examples*:
  ```
  [
    ["VAR", "$MY_LIST", ["LIST", 1, 2, 3]],
    ["FOR_EACH_VAL", "$VAL", "$MY_LIST", ["LOG", "$VAL"]]
  ]
  ```
  """

  @doc """
  Executes the 'LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LIST' operation.

  ## Returns

  The result of the 'LIST' operation.
  """
  def execute(game, code, trace) do
    list = Enum.slice(code, 1, Enum.count(code))
    Enum.reduce(Enum.with_index(list), [], fn({item, index}, acc)->
      acc ++ [Evaluate.evaluate(game, item, trace ++ ["index #{index}"])]
    end)
  end


end
