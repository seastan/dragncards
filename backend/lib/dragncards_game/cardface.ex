
defmodule DragnCardsGame.CardFace do
  alias DragnCardsUtil.{ConvertType}
  @moduledoc """
  Represents a playing card.
  """
  require Logger

  @type t :: Map.t()


  @spec trigger_steps_from_face_details(Map.t(), List.t()) :: Map.t()
  def trigger_steps_from_face_details(face_details, step_triggers) do
    if step_triggers do
      Enum.reduce(step_triggers, %{}, fn(trigger_info, acc) ->
        prop = trigger_info["faceProperty"]
        regex_string = trigger_info["regex"]
        step_id = trigger_info["stepId"]
        search_string = face_details[prop]
        if search_string do
          case Regex.compile(regex_string, "i") do
            {:ok, regex} ->
              if String.match?(search_string |> String.downcase(), regex) do
                Map.put(acc, step_id, true)
              else
                acc
              end
            _ ->
              acc
          end
        else
          acc
        end
      end)
    else
      %{}
    end
  end

  @spec card_face_from_card_face_details(Map.t(), Map.t(), String.t(), String.t()) :: Map.t()
  def card_face_from_card_face_details(card_face_details, game_def, side, card_db_id) do
    Logger.debug("card_face_from_card_face_details #{side} #{card_db_id}")
    type = card_face_details["type"]
    name = card_face_details["name"]
    triggers = trigger_steps_from_face_details(card_face_details, game_def["stepReminderRegex"])
    ability = get_in(game_def, ["automation", "cards", card_db_id, "ability", side])
    width = game_def["cardTypes"][type]["width"] || game_def["cardBacks"][name]["width"] || 1
    height = game_def["cardTypes"][type]["height"] || game_def["cardBacks"][name]["height"] || 1
    # Loop over keys in card_face_details and convert to correct type
    # for each key
    card_face = Enum.reduce(card_face_details, %{}, fn({key, value}, acc) ->
      # If the type has not been defined in game_def['faceProperties'], then make it a string
      val_type = case get_in(game_def, ["faceProperties", key, "type"]) do
        nil -> "string"
        val -> val
      end

      if value == nil or (value == "" and val_type != "string") do
        Map.put(acc, key, nil)
      else
        # Match on game_def['faceProperties'][key]['type']
        # and convert value to that type
        case game_def["faceProperties"][key]["type"] do
          "integer" ->
            Map.put(acc, key, ConvertType.convert_to_integer(value))
          "boolean" ->
            Map.put(acc, key, ConvertType.convert_to_boolean(value))
          "string" ->
            Map.put(acc, key, ConvertType.convert_to_string(value))
          "float" ->
            Map.put(acc, key, ConvertType.convert_to_float(value))
          "map" ->
            Map.put(acc, key, ConvertType.convert_to_map(value))
          "list" ->
            Map.put(acc, key, ConvertType.convert_to_list(value))
          _ ->
            Map.put(acc, key, value)
        end
      end
    end)

    card_face
    |> Map.put("triggers", triggers)
    |> Map.put("ability", ability)
    |> Map.put("width", width)
    |> Map.put("height", height)
  end
end
