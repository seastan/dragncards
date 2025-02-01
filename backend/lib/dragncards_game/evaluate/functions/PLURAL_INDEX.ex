defmodule DragnCardsGame.Evaluate.Functions.PLURAL_INDEX do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `input` (anything)
  2. `languageString` (string, optional)

  Returns i18n "plural index" for the abs of integer representation of `input` in a supported language. For integer representation see `INSPECT_INT`. For supported languages, see `LANGUAGE`.

  For example, in English, index of 0 is returned for a value of 1, while for all other values index of 1 is returned. Different languages have different rules (and up to 6 indices).

  Returned index can be used to select correct form of text to be logged or shown (via labels incorporating that index in their id or language key) for any given integer value in any supported language. See `FORMAT`.

  Rules taken from: https://www.gnu.org/savannah-checkouts/gnu/gettext/manual/html_node/Plural-forms.html

  *Returns*:
  (integer) The result of the operation.
  """

  @doc """
  Executes the 'PLURAL_INDEX' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PLURAL_INDEX' operation.

  ## Returns

  The result of the 'PLURAL_INDEX' operation.
  """
  def plural_index_vl(_game, v, lv, _trace) do
    n = abs(v)
    n10 = Integer.mod(n, 10)
    n100 = Integer.mod(n, 100)
    cond do
      lv in ["English", "", "Bahasa Indonesian", "Bulgarian", "Danish", "Dutch", "Esperanto", "Estonian", "Faroese", "Finnish", "German", "Greek", "Hebrew", "Hungarian", "Italian", "Norwegian", "Portuguese", "Spanish", "Swedish", "Turkish"] ->
        cond do
          n != 1 -> 1
          true -> 0
        end
      lv in ["Japanese", "Vietnamese", "Korean", "Thai"] -> 0
      lv in ["Brazilian Portuguese", "French"] ->
        cond do
          n > 1 -> 1
          true -> 0
        end
      lv == "Latvian" ->
        cond do
          n10 == 1 and n100 != 11 -> 0
          n != 0 -> 1
          true -> 2
        end
      lv == "Irish" ->
        cond do
          n == 1 -> 0
          n == 2 -> 1
          true -> 2
        end
      lv == "Romanian" ->
        cond do
          n == 1 -> 0
          n == 0 or (n100 > 0 and n100 < 20) -> 1
          true -> 2
        end
      lv == "Lithuanian" ->
        cond do
          n10 == 1 and n100 != 11 -> 0
          n10 >= 2 and (n100 < 10 or n100 >= 20) -> 1
          true -> 2
        end
      lv in ["Ukrainian", "Croatian", "Serbian", "Belarusian", "Russian"] ->
        cond do
          n10 == 1 and n100 != 11 -> 0
          n10 >= 2 and n10 <= 4 and (n100 < 10 or n100 >= 20) -> 1
          true -> 2
        end
      lv in ["Czech", "Slovak"] ->
        cond do
          n == 1 -> 0
          n >= 2 and n <= 4 -> 1
          true -> 2
        end
      lv == "Polish" ->
        cond do
          n == 1 -> 0
          n10 >= 2 and n10 <= 4 and (n100 < 10 or n100 >= 20) -> 1
          true -> 2
        end
      lv == "Slovenian" ->
        cond do
          n100 == 1 -> 0
          n100 == 2 -> 1
          n100 == 3 or n100 == 4 -> 2
          true -> 3
        end
      lv == "Arabic" ->
        cond do
          n <= 2 -> n
          n100 >= 3 and n100 <= 10 -> 3
          n100 >= 11 -> 4
          true -> 5
        end
      true ->
        cond do
          n != 1 -> 1
          true -> 0
        end
    end
  end

  def plural_index(game, input, languageString, trace) do
    intValue = DragnCardsGame.Evaluate.Functions.INSPECT_INT.to_int(game, input, trace ++ ["to_int"])
    language = DragnCardsGame.Evaluate.Functions.LANGUAGE.to_language(game, languageString, trace ++ ["to_language"])
    plural_index_vl(game, intValue, language, trace ++ ["plural_index_vl"])
  end

  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 1, 2)
    input = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["input"])
    languageString = if argc > 1 do
      Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["languageString"])
    else
      nil
    end
    if !is_nil(languageString) and !is_binary(languageString) do
      raise "PLURAL_INDEX: languageString must be a string"
    end
    plural_index(game, input, languageString, trace ++ ["plural_index"])
  end


end
