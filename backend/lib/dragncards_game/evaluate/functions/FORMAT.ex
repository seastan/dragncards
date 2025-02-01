defmodule DragnCardsGame.Evaluate.Functions.FORMAT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `formatString` (string)
  2. Any number of arguments

  Returns a formatted string using `formatString` and additional arguments converted using the `INSPECT` operation.

  Placeholders to insert additional arguments are in the `{index}` format, for example `{0}`. Hint for the `INSPECT` operation can be provided after a colon, for example `{0:A}`.

  `formatString` can contain label references (starting with `id:`), and they will be resolved first in default language (see `LANGUAGE`). Only a subset of characters is supported in label ids, and these are letters `A-Za-z`, digits `0-9`, and underscore `_`. Nesting label references within labels is not supported. A label reference can optionally contain an argument placeholder after a hyphen (without a hint), which will be used to determine plural index (see `PLURAL_INDEX` and `LABEL`) of the label, and whose integer representation will be used to replace `#` placeholder in that label's contents.

  *Returns*:
  (string) The result of the operation.

  *Examples*:

  Direct usage:
  ```
  ["FORMAT", "{0} = {0}", 2]
  ```
  returns `"2 = 2"`.

  Hints (returns number of stacks in player1Hand group):
  ```
  ["FORMAT", "{0:INT} card{0:S} in {0}.", "player1Hand"]
  ```
  returns, for example, `"2 cards in Player 1 Hand."`.

  Simple label replacement:
  ```
  ["FORMAT", "id:someLabel", 2]
  ```
  with label
  ```
  "someLabel": {
    "English": "{0} = {0}"
  }
  ```
  returns `"2 = 2"`.

  Advanced label replacement:
  ```
  ["FORMAT", "id:someLabel-{0}", "player1Hand"]
  ```
  with labels
  ```
  "someLabel": {
    "English-0": "# card in {0}.",
    "English-1": "# cards in {0}."
  }
  ```
  returns, for example, `"2 cards in Player 1 Hand."`.


  Missing label:
  ```
  ["FORMAT", "id:missing-{0}", "player1Hand"]
  ```
  returns, `"missing.English-0"`.
  """

  @doc """
  Executes the 'FORMAT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FORMAT' operation.

  ## Returns

  The result of the 'FORMAT' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1, nil)
    formatString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["formatString"])
    if !is_binary(formatString) do
      raise "FORMAT: formatString must be a string"
    end
    list = Enum.slice(code, 2, Enum.count(code))
    formatStringResolved = if String.contains?(formatString, "id:") do
      language = DragnCardsGame.Evaluate.Functions.LANGUAGE.to_language(game, nil, trace ++ ["to_language"])
      labelList = Regex.scan(~r/id:(?<label>[A-Za-z0-9_]+)(-{(?<idx>[0-9]+)})?/, formatString, capture: :all_names)
      Enum.reduce(Enum.uniq(labelList), formatString, fn item, acc ->
        labelId = Enum.at(item, 1)
        idx = Enum.at(item, 0)
        if idx !== "" do
          element = Evaluate.evaluate(game, Enum.at(list, String.to_integer(idx)), trace ++ ["evaluate #{idx}"])
          intValue = DragnCardsGame.Evaluate.Functions.INSPECT_INT.to_int(game, element, trace ++ ["to_int #{idx}"])
          pluralIndex = DragnCardsGame.Evaluate.Functions.PLURAL_INDEX.plural_index_vl(game, intValue, nil, trace ++ ["plural_index_vl #{idx}"])
          labelContent = String.replace(DragnCardsGame.Evaluate.Functions.LABEL.get_label_l(game, labelId, language, pluralIndex, trace ++ ["get_label_l #{labelId}.#{language}-#{pluralIndex}"]), "#", "#{intValue}")
          String.replace(acc, "id:#{labelId}-{#{idx}}", labelContent)
        else
          labelContent = DragnCardsGame.Evaluate.Functions.LABEL.get_label_l(game, labelId, language, nil, trace ++ ["get_label_l #{labelId}.#{language}"])
          String.replace(acc, "id:#{labelId}", labelContent)
        end
      end)
    else
      formatString
    end
    if String.contains?(formatStringResolved, "{") do
      paramList = Regex.scan(~r/{(?<idx>[0-9]+)(:(?<hint>[A-Za-z0-9_-]+))?}/, formatStringResolved, capture: :all_names)
      Enum.reduce(Enum.uniq(paramList), formatStringResolved, fn item, acc ->
        idx = Enum.at(item, 1)
        hint = Enum.at(item, 0)
        element = Evaluate.evaluate(game, Enum.at(list, String.to_integer(idx)), trace ++ ["evaluate #{idx}"])
        cond do
          hint !== "" -> String.replace(acc, "{#{idx}:#{hint}}", DragnCardsGame.Evaluate.Functions.INSPECT.to_string(game, element, hint, trace ++ ["to_string #{idx}"]))
          true -> String.replace(acc, "{#{idx}}", DragnCardsGame.Evaluate.Functions.INSPECT.to_string(game, element, nil, trace ++ ["to_string #{idx}"]))
        end
      end)
    else
      formatStringResolved
    end
  end


end
