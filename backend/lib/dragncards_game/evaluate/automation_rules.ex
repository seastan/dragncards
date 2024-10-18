defmodule DragnCardsGame.AutomationRules do
  @moduledoc """
  """
  require Logger
  alias DragnCardsGame.{GameUI, Evaluate, RuleMap}
  alias DragnCards.{Rooms, Plugins}

  def split_path_string(path_string) do
    path_string
    |> String.split("/")
    |> Enum.filter(&(&1 != ""))
  end

  def split_path_strings(path_strings) do
    paths = Enum.map(path_strings, &split_path_string/1)
    paths
  end

  def add_rule_to_game(game, rule, rule_id) do
    game
    |> put_in(["ruleById", rule_id], rule)
    |> add_rule_id_to_rule_map(rule, rule_id)
  end

  def add_rule_id_to_rule_map(game, rule, rule_id) do
    new_rule_map = rule["listenTo"]
    |> Enum.reduce(game["ruleMap"], fn (listen_to_string, acc) ->
      listen_to_path = Evaluate.evaluate(game, listen_to_string, ["add_rule_to_game", rule_id]) # Convert "/path/to/listen/to" to ["path", "to", "listen", "to"]
      RuleMap.add_to_rule_map(acc, listen_to_path, rule_id)
    end)
    put_in(game, ["ruleMap"], new_rule_map)
  end

  def implement_game_rules(game, rules) do
    Enum.reduce(rules, game, fn ({rule_id, rule}, acc) ->
      # Generate a unique ID for the rule
      add_rule_to_game(acc, rule, rule_id)
    end)
  end

  def get_enters_play_condition(side) do
    curr_condition = "$THIS.inPlay"
    curr_condition = if side != nil do
      ["AND", curr_condition , ["EQUAL", "$THIS.currentSide", side]]
    else
      ["AND", curr_condition]
    end
    prev_condition = [["NOT", ["PREV", "$THIS.inPlay"]]]
    prev_condition = if side != nil do
      prev_condition ++ [["NOT_EQUAL", ["PREV", "$THIS.currentSide"], side]]
    else
      prev_condition
    end
    curr_condition ++ [["OR"] ++ prev_condition]
  end

  def get_in_play_condition(side) do
    curr_condition = "$THIS.inPlay"
    curr_condition = if side != nil do
      ["AND", curr_condition, ["EQUAL", "$THIS.currentSide", side]]
    else
      curr_condition
    end
  end

  def add_liten_to(listeners, listen_to) do
    if listen_to != nil do
      listeners ++ listen_to
    else
      listeners
    end
  end

  def add_condition(condition, new_condition) do
    if new_condition != nil do
      ["AND", condition, new_condition]
    else
      condition
    end
  end

  def add_listen_to_side(listen_to, side) do
    if side != nil do
      listen_to ++ ["/cardById/$THIS_ID/currentSide"]
    else
      listen_to
    end
  end

  def replace_this_id_with_card_id(rule, card_id) do
    listen_to = Enum.map(rule["listenTo"], fn path ->
      String.replace(path, "$THIS_ID", card_id)
    end)

    Map.put(rule, "listenTo", listen_to)
  end

  def preprocess_card_automation_rule(rule_id, rule, card_id) do
    rule_type = rule["type"]
    # then = [["MULTI_VAR", "$THIS_ID", card_id, "$THIS", "$GAME.cardById.#{card_id}"]] ++ rule["then"]
    # rule = Map.put(rule, "then", then)
    case rule_type do
      "entersPlay" ->
        listen_to = ["/cardById/$THIS_ID/inPlay"] |> add_listen_to_side(rule["side"]) |> add_liten_to(rule["listenTo"])
        condition = get_enters_play_condition(rule["side"]) |> add_condition(rule["condition"])
        rule
        |> Map.put("type", "trigger")
        |> Map.put("listenTo", listen_to)
        |> Map.put("condition", condition)
      "whileInPlay" ->
        listen_to = ["/cardById/$THIS_ID/inPlay"] |> add_listen_to_side(rule["side"]) |> add_liten_to(rule["listenTo"])
        condition = get_in_play_condition(rule["side"]) |> add_condition(rule["condition"])
        rule
        |> Map.put("type", "passive")
        |> Map.put("listenTo", listen_to)
        |> Map.put("condition", condition)
      _ ->
        rule
    end
    |> Map.put("this_id", card_id)
    |> Map.put("id", rule_id)
    |> replace_this_id_with_card_id(card_id)
  end

  def preprocess_card_automation_rules(card_rules, card_id) do
    Enum.reduce(card_rules, %{}, fn({rule_id, rule}, acc) ->
      rule_id = "#{rule_id}_#{card_id}"
      Map.put(acc, rule_id, preprocess_card_automation_rule(rule_id, rule, card_id))
    end)
  end

  def implement_card_rules(game, game_def, card) do
    card_automation = game_def["automation"]["cards"][card["databaseId"]]
    card_rules = get_in(card_automation, ["rules"])
    if is_map(card_rules) do
      preprocess_card_automation_rules(card_rules, card["id"])
      |> Enum.reduce(game, fn ({rule_id, rule}, acc) ->

        acc
        |> add_rule_to_game(rule, rule_id)
        |> add_rule_id_to_card(card, rule_id)
      end)
    else
      game
    end
  end

  def add_rule_id_to_card(game, card, rule_id) do
    update_in(game, ["cardById", card["id"], "ruleIds"], fn rule_ids ->
      case rule_ids do
        nil -> [rule_id]
        _ -> [rule_id | rule_ids]
      end
    end)
  end

  def remove_rule_from_game(game, rule_id) do
    # Remove the rule from the game state
    update_in(game, ["ruleById"], fn rules -> Map.delete(rules, rule_id) end)
  end

  def remove_rules_from_game(game, rule_ids) do
    # Remove multiple rules from the game state
    Enum.reduce(rule_ids, game, fn rule_id, acc -> remove_rule_from_game(acc, rule_id) end)
  end

  def apply_automation_rules_for_update_pathstrings(game, game_old, update_pathstrings, target_path, trace) do
    update_paths = split_path_strings(update_pathstrings)
    apply_automation_rules_for_update_paths(game, game_old, update_paths, target_path, trace)
  end

  def apply_automation_rules_for_update_paths(game, game_old, update_paths, target_path, trace) do
    if is_map(game["ruleMap"]) and game["automationEnabled"] == true do
      update_paths
      |> RuleMap.get_ids_by_paths(game["ruleMap"])
      |> Enum.map(fn id -> get_in(game["ruleById"], [id]) end)
      |> Enum.sort_by(&(&1["priority"] || :infinity))
      |> Enum.reduce(game, fn rule, acc ->
        apply_automation_rule_wrapper(rule, target_path, game_old, acc, trace ++ ["apply_automation_rule_wrapper #{rule["id"]}"])
      end)
    else
      game
    end
  end

  def apply_automation_rule_wrapper(rule, target_path, game_old, game_new, trace) do
    game_new =
      if rule["this_id"] do
        game_new |>
        Evaluate.evaluate(["VAR", "$THIS_ID", rule["this_id"]], trace ++ ["game_new"]) |>
        Evaluate.evaluate(["VAR", "$THIS", "$GAME.cardById.$THIS_ID"], trace ++ ["game_new"])
      else
        game_new
      end

    game_old =
      if rule["this_id"] do
        game_old |>
        Evaluate.evaluate(["VAR", "$THIS_ID", rule["this_id"]], trace ++ ["game_old"]) |>
        Evaluate.evaluate(["VAR", "$THIS", "$GAME.cardById.$THIS_ID"], trace ++ ["game_old"])
      else
        game_old
      end

    game_new =
      if is_list(target_path) and Enum.count(target_path) >= 2 do
        game_new |>
        Evaluate.evaluate(["VAR", "$TARGET_ID", Enum.at(target_path,1)], trace ++ ["game_new"]) |>
        Evaluate.evaluate(["VAR", "$TARGET", "$GAME."<>Enum.at(target_path,0)<>".$TARGET_ID"], trace ++ ["game_new"])
      else
        game_new
      end
    game_old =
      if is_list(target_path) and Enum.count(target_path) >= 2 do
        game_old |>
        Evaluate.evaluate(["VAR", "$TARGET_ID", Enum.at(target_path,1)], trace ++ ["game_old"]) |>
        Evaluate.evaluate(["VAR", "$TARGET", "$GAME."<>Enum.at(target_path,0)<>".$TARGET_ID"], trace ++ ["game_old"])
      else
        game_old
      end

    prev_prev_game = game_new["prev_game"]
    game_new = put_in(game_new["prev_game"], game_old)
    game_new = case rule["type"] do
      "trigger" ->
        apply_trigger_rule(rule, game_old, game_new, trace ++ ["apply_trigger_rule #{rule['id']}"])
      "passive" ->
        apply_passive_rule(rule, game_old, game_new, trace ++ ["apply_passive_rule #{rule['id']}"])
      _ ->
        game_new
    end
    game_new = put_in(game_new["prev_game"], prev_prev_game)
    game_new
  end

  def apply_trigger_rule(rule, _game_old, game_new, trace) do
    if Evaluate.evaluate(game_new, rule["condition"], trace ++ [Jason.encode!(rule["condition"])]) do
      run_rule_code(game_new, rule, rule["then"], trace ++ ["then"])
      #Evaluate.evaluate(game_new, rule["then"], trace ++ [Jason.encode!("THEN")])
    else
      game_new
    end
  end

  def apply_passive_rule(rule, game_old, game_new, trace) do
    onBefore = Evaluate.evaluate(game_old, rule["condition"], trace ++ ["game_old", Jason.encode!(rule["condition"])])
    onAfter = Evaluate.evaluate(game_new, rule["condition"], trace ++ ["game_new", Jason.encode!(rule["condition"])])

    onDo = rule["onDo"]
    offDo = rule["offDo"]

    cond do
      onDo == nil && offDo == nil ->
        raise "Tried to trigger a passive rule that does not have an onDo or offDo."
      !onBefore && onAfter && onDo != nil ->
        run_rule_code(game_new, rule, onDo, trace ++ ["onDo"])
        #Evaluate.evaluate(game_new, onDo, trace ++ ["onDo"])
      onBefore && !onAfter && offDo != nil ->
        run_rule_code(game_new, rule, offDo, trace ++ ["offDo"])
        #Evaluate.evaluate(game_new, offDo, trace ++ ["offDo"])
      true ->
        game_new
    end
  end

  def var_statements_for_this_and_target(game) do
    Enum.reduce(["$THIS_ID", "$THIS", "$TARGET_ID", "$TARGET"], [], fn (var, acc) ->
      val = Evaluate.evaluate(game, var)
      if val != nil do
        acc ++ [["VAR", var, val]]
      else
        acc
      end
    end)
  end

  def run_rule_code(game, rule, rule_code, trace) do
    case rule["autoRun"]["status"] do
      "prompt" ->
        IO.puts("rune 1")
        IO.inspect(rule)
        promptPlayerI = Evaluate.evaluate(game, rule["autoRun"]["promptPlayerI"], trace ++ ["promptPlayerI"])
        promptMessage = Evaluate.evaluate(game, rule["autoRun"]["promptMessage"], trace ++ ["promptMessage"])
        # IO.inspect(promptPlayerI)
        # IO.inspect(rule)
        # IO.inspect(Evaluate.evaluate(game, "$THIS_ID"))
        # IO.inspect(Evaluate.evaluate(game, "$THIS"))
        # IO.inspect(Evaluate.evaluate(game, "$THIS.controller"))
        if promptPlayerI == nil do
          raise "Tried to confirm rule automation #{rule["id"]} with a null player."
        end
        var_statements = var_statements_for_this_and_target(game)
        #game = Evaluate.evaluate(game, ["TARGET_PLAYER_I", "$TARGET_ID", promptPlayerI, true])
        always_code = ["POINTER", [
          #["TARGET_PLAYER_I", "$THIS_ID", promptPlayerI, false],
          ["LOG", "{{$ALIAS_N}} picked always."],
          ["SET", "/ruleById/#{rule["id"]}/autoRun/status", "always"],
          var_statements ++ rule_code
        ]]
        yes_code = ["POINTER", [
          #["TARGET_PLAYER_I", "$THIS_ID", promptPlayerI, false],
          ["LOG", "{{$ALIAS_N}} picked yes."],
          var_statements ++ rule_code
        ]]
        no_code = nil
        never_code = ["POINTER", [
          #["TARGET_PLAYER_I", "$THIS_ID", promptPlayerI, false],
          ["SET", "/ruleById/#{rule["id"]}/autoRun/status", "never"]
        ]]
        Evaluate.evaluate(game, ["PROMPT", promptPlayerI, "confirmAutomation", promptMessage, always_code, yes_code, no_code, never_code])
      "never" ->
        game
      _ ->
        Evaluate.evaluate(game, rule_code, trace ++ ["run_rule_code"])
      end
  end

end
