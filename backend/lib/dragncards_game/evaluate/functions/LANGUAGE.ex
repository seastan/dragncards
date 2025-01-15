defmodule DragnCardsGame.Evaluate.Functions.LANGUAGE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `languageString` (string, optional)

  Returns either `languageString` (if it's one of supported languages), `$GAME.options.language` (if it's one of supported languages), or `English`.

  Supported languages: Arabic, Bahasa Indonesian, Belarusian, Brazilian Portuguese, Bulgarian, Croatian, Czech, Danish, Dutch, English, Esperanto, Estonian, Faroese, Finnish, French, German, Greek, Hebrew, Hungarian, Irish, Italian, Japanese, Korean, Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Russian, Serbian, Slovak, Slovenian, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'LANGUAGE' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'LANGUAGE' operation.

  ## Returns

  The result of the 'LANGUAGE' operation.
  """
  def to_language(game, v, _trace) do
    if (v in ["Arabic", "Bahasa Indonesian", "Belarusian", "Brazilian Portuguese", "Bulgarian", "Croatian", "Czech", "Danish", "Dutch", "Esperanto", "Estonian", "Faroese", "Finnish", "French", "German", "Greek", "Hebrew", "Hungarian", "Irish", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Norwegian", "Polish", "Portuguese", "Romanian", "Russian", "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Thai", "Turkish", "Ukrainian", "Vietnamese"]) do
      v
    else
      try do
        language = game["options"]["language"]
        if (language in ["Arabic", "Bahasa Indonesian", "Belarusian", "Brazilian Portuguese", "Bulgarian", "Croatian", "Czech", "Danish", "Dutch", "Esperanto", "Estonian", "Faroese", "Finnish", "French", "German", "Greek", "Hebrew", "Hungarian", "Irish", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Norwegian", "Polish", "Portuguese", "Romanian", "Russian", "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Thai", "Turkish", "Ukrainian", "Vietnamese"]) do
          language
        else
          "English"
        end
      rescue
        _ -> "English"
      end
    end
  end

  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 0, 1)
    languageString = if argc > 0 do
      Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["languageString"])
    else
      nil
    end
    if !is_nil(languageString) and !is_binary(languageString) do
      raise "LANGUAGE: languageString must be a string"
    end
    to_language(game, languageString, trace ++ ["to_language"])
  end


end
