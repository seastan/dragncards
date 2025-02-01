defmodule DragnCardsGame.Evaluate.Functions.LABEL do
  alias DragnCardsGame.Evaluate
  alias DragnCardsGame.{PluginCache}
  @moduledoc """
  *Arguments*:
  1. `labelId` (string)
  2. `languageString` (string, optional)
  3. `pluralIndex` (integer, optional)

  Returns the contents of a label for given `labelId`, `languageString`, and `pluralIndex`. If such label cannot be found returns its "technical" key as placeholder.

  This operation handles `labelId` with or without the `"id:"` prefix. It is also able to fall back from a `pluralIndex` version to one without it, in case the first is missing. In addition, it is able to fall back from any language version to English, in case the first is missing. Since plural indices are not compatible between languages the order of fall back is `labelId.languageString-pluralIndex` to `labelId.languageString` to `labelId.English`.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'LABEL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LABEL' operation.

  ## Returns

  The result of the 'LABEL' operation.
  """
  def get_label_l(game, labelId, l, pluralIndex, _trace) do
    labels = PluginCache.get_game_def_cached(game["options"]["pluginId"])["labels"]
    if is_nil(pluralIndex) do
      try do
        lc = labels[labelId][l]
        if is_nil(lc) or lc == "" do
          lcf = labels[labelId]["English"]
          if is_nil(lcf) or lcf == "" do
            "#{labelId}.#{l}"
          else
            lcf
          end
        else
          lc
        end
      rescue
        _ -> "#{labelId}.#{l}"
      end
    else
      try do
        lc = labels[labelId]["#{l}-#{pluralIndex}"]
        if is_nil(lc) or lc == "" do
          lcf1 = labels[labelId][l]
          if is_nil(lcf1) or lcf1 == "" do
            lcf2 = labels[labelId]["English"]
            if is_nil(lcf2) or lcf2 == "" do
              "#{labelId}.#{l}-#{pluralIndex}"
            else
              lcf2
            end
          else
            lcf1
          end
        else
          lc
        end
      rescue
        _ -> "#{labelId}.#{l}-#{pluralIndex}"
      end
    end
  end

  def get_label(game, labelId, languageString, pluralIndex, trace) do
    language = DragnCardsGame.Evaluate.Functions.LANGUAGE.to_language(game, languageString, trace ++ ["to_language"])
    get_label_l(game, labelId, language, pluralIndex, trace ++ ["get_label_l"])
  end

  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 1, 3)
    labelId = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["labelId"])
    if !is_binary(labelId) do
      raise "LABEL: labelId must be a string"
    end
    languageString = if argc > 1 do
      Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["languageString"])
    else
      nil
    end
    if !is_nil(languageString) and !is_binary(languageString) do
      raise "LABEL: languageString must be a string"
    end
    pluralIndex = if argc > 2 do
      Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["pluralIndex"])
    else
      nil
    end
    if !is_nil(pluralIndex) and !is_integer(pluralIndex) do
      raise "LABEL: pluralIndex must be an integer"
    end
    get_label(game, String.replace_leading(labelId, "id:", ""), languageString, pluralIndex, trace ++ ["get_label"])
  end


end
