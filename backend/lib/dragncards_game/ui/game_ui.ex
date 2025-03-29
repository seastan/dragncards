defmodule DragnCardsGame.GameUI do
  @moduledoc """
  One level on top of Game.
  """


  require Logger
  alias DragnCards.Plugins.CustomCardDb
  alias ElixirSense.Providers.Eval
  alias DragnCardsGame.GameVariables
  alias DragnCardsGame.{Game, GameUI, Stack, Card, PlayerInfo, Evaluate, GameVariables, Evaluate.Variables.ALIAS_N, AutomationRules, RuleMap, PluginCache}

  alias DragnCards.{Repo, Replay, Plugins, Plugins.CustomCardDb, Users}
  alias DragnCards.Rooms.Room

  @type t :: Map.t()

  @spec new(String.t(), integer(), Map.t()) :: GameUI.t()
  def new(room_slug, user_id, %{} = options) do
    Logger.debug("Making new GameUI")
    plugin_id = options["pluginId"]
    game_def = PluginCache.get_game_def_cached(plugin_id)
    plugin_author_id = Plugins.get_author_id(options["pluginId"])
    %{game: game, deltas: deltas} = Game.load(room_slug, user_id, game_def, options)

    gameui = %{
      "game" => game,
      "roomSlug" => room_slug,
      "options" => options,
      "pluginAuthorId" => plugin_author_id,
      "createdAt" => DateTime.utc_now(),
      "createdBy" => user_id,
      "privacyType" => options["privacyType"],
      "playerInfo" => %{},
      "deltas" => deltas,
      "replayStep" => Enum.count(deltas)-1,
      "sockets" => %{},
      "spectators" => %{},
    }
    Logger.debug("Made new GameUI")

    # Sit the host down in the first player's seat
    gameui = if game_def["vacantSeatOnNewGame"] do
      gameui
    else
      Logger.debug("Sitting in player1 seat")
      sit_down(gameui, "player1", user_id)
    end

    # Post New Game Action List
    gameui = if game_def["automation"]["postNewGameActionList"] != nil and options["replayUuid"] == nil do
      options = %{
        "action_list" => game_def["automation"]["postNewGameActionList"],
        "player_ui" => %{"playerN" => "player1"}
      }
      new_gameui = GameUI.game_action(gameui, user_id, "evaluate", options)
      GameUI.add_delta(new_gameui, gameui)
    else
      gameui
    end

    gameui
  end



  ############################################################
  # Seats                                                    #
  ############################################################

  def sit_down(gameui, player_n, user_id) do
    player_info = PlayerInfo.new(user_id)
    log_alias = ALIAS_N.log_alias_n(player_n, player_info["alias"])
    gameui = gameui
    |> put_in(["playerInfo", player_n], player_info)
    |> put_in(["game", "playerData", player_n, "user_id"], user_id)
    |> put_in(["game", "playerData", player_n, "alias"], player_info["alias"])
    |> update_player_data(player_n, user_id)

    gameui
    |> put_in(["game", "messages"], ["#{log_alias} sat down in #{player_n}'s seat."])
  end

  def get_up(gameui, player_n) do
    alias_n = gameui["game"]["playerData"][player_n]["alias"]
    log_alias = ALIAS_N.log_alias_n(player_n, alias_n)
    gameui
    |> put_in(["game", "messages"], ["#{log_alias} got up from #{player_n}'s seat."])
    |> put_in(["playerInfo", player_n], nil)
    |> put_in(["game", "playerData", player_n, "alias"], nil)
    |> put_in(["game", "playerData", player_n, "user_id"], nil)
  end

  defp update_player_data(gameui, _player_n, nil), do: gameui

  defp update_player_data(gameui, player_n, user_id) do
    user = Users.get_user(user_id)
    game_def = PluginCache.get_game_def_cached(gameui["game"]["pluginId"])
    plugin_id = gameui["options"]["pluginId"]
    plugin_player_settings = user.plugin_settings["#{plugin_id}"]["player"]
    action_list = if plugin_player_settings != nil do
      Enum.reduce(plugin_player_settings, [], fn({key, val}, acc) ->
        label = game_def["playerProperties"][key]["label"]
        acc = acc ++ [["LOG", "{{$ALIAS_N}} set their #{label} to #{inspect(val)}."]]
        acc ++ [["SET", "/playerData/#{player_n}/#{key}", val]]
      end)
    else
      []
    end

    # Submit the player data changes as an action
    gameui = if Enum.count(action_list) > 0 do
      options = %{
        "action_list" => action_list,
        "player_ui" => %{"playerN" => player_n}
      }
      game_action(gameui, user_id, "evaluate", options)
    else
      gameui
    end

    gameui = if game_def["automation"]["postSitDownActionList"] do
      options = %{
        "action_list" => game_def["automation"]["postSitDownActionList"],
        "player_ui" => %{"playerN" => player_n}
      }
      game_action(gameui, user_id, "evaluate", options)
    else
      gameui
    end

    gameui
  end

  ############################################################
  # Getters                                                  #
  ############################################################

  def get_group(game, group_id) do
    game["groupById"][group_id]
  end

  def get_group_controller(game, group_id) do
    group = get_group(game, group_id)
    if group do group["controller"] else nil end
  end

  def get_group_type(game, group_id) do
    group = get_group(game, group_id)
    if group do group["type"] else nil end
  end

  def get_stack_ids(game, group_id) do
    get_group(game,group_id)["stackIds"]
  end

  def get_stack(game, stack_id) do
    if stack_id == nil do
      raise "stack_id is nil"
    end
    case game["stackById"][stack_id] do
      nil -> raise "Stack not found: #{stack_id}"
      stack -> stack
    end
  end

  def get_card_ids(game, stack_id) do
    get_stack(game, stack_id)["cardIds"]
  end

  def get_card(game, card_id) do
    game["cardById"][card_id]
  end

  def get_current_card_face(game, card_id) do
    card = get_card(game, card_id)
    card["sides"][card["currentSide"]]
  end

  def get_group_by_stack_id(game, stack_id) do
    Enum.reduce(game["groupById"], nil, fn({group_id, group}, acc) ->
      if group_id !== group["id"] do
        raise "Group id mismatch: #{group_id} != #{group["id"]}. When manipulating groups, you must ensure that its id matches its key in groupById."
      end
      if stack_id in group["stackIds"] do group else acc end
    end)
  end

  def get_group_by_card_id(game, card_id) do
    stack = get_stack_by_card_id(game, card_id)
    get_group_by_stack_id(game, stack["id"])
  end

  def get_stack_index_by_stack_id(game, stack_id) do
    group_id = get_group_by_stack_id(game, stack_id)["id"]
    stack_ids = get_stack_ids(game, group_id)
    if is_list(stack_ids) do
      Enum.find_index(stack_ids, fn id -> id == stack_id end)
    else
      0
    end
  end

  def get_stack_by_card_id(game, card_id) do
    stack = Enum.reduce(game["stackById"], nil, fn({_stack_id, stack}, acc) ->
      if card_id in stack["cardIds"] do stack else acc end
    end)
    if stack do stack else raise "Card not found: #{card_id}" end
  end

  def get_stack_by_index(game, group_id, stack_index) do
    stack_ids = game["groupById"][group_id]["stackIds"]
    game["stackById"][Enum.at(stack_ids, stack_index)]
  end

  def get_parent_card_by_stack_id(game, stack_id) do
    if stack_id == nil do
      nil
    else
      stack = get_stack(game, stack_id)
      parent_card_id = Enum.at(stack["cardIds"], 0)
      if parent_card_id != nil do
        get_card(game, parent_card_id)
      else
        nil
      end
    end
  end

  def get_card_index_by_card_id(game, card_id, stack_id) do
    card_ids = get_card_ids(game, stack_id)
    Enum.find_index(card_ids, fn id -> id == card_id end)
  end

  def gsc(game, card_id) do
    stack = get_stack_by_card_id(game, card_id)
    stack_id = stack["id"]
    card_index = get_card_index_by_card_id(game, card_id, stack_id)
    stack_index = get_stack_index_by_stack_id(game, stack_id)
    group_id = get_group_by_stack_id(game, stack_id)["id"]
    {group_id, stack_index, card_index}
  end

  def get_card_by_group_id_stack_index_card_index(game, gsc) do
    group_id = Enum.at(gsc,0)
    stack_index = Enum.at(gsc,1)
    card_index = Enum.at(gsc,2)
    group = get_group(game, group_id)
    stack_ids = group["stackIds"]
    if Enum.count(stack_ids) <= stack_index do
      raise "Stack not found at stack_index:#{stack_index}"
    else
      stack = get_stack(game, Enum.at(stack_ids, stack_index))
      card_ids = stack["cardIds"]
      if Enum.count(card_ids) <= card_index do
        raise "Card not found at card_index:#{card_index}"
      else
        get_card(game, Enum.at(card_ids, card_index))
      end
    end
  end

  ############################################################
  # Updaters                                                 #
  ############################################################

  def update_stack_ids(game, group_id, new_stack_ids) do
    Evaluate.evaluate(game, ["SET", "/groupById/" <> group_id <> "/stackIds", ["LIST"] ++ new_stack_ids], ["update_stack_ids group_id:#{group_id}"])

    # Update the indices of all cards in these stacks - This turned out to be very slow, becuase each SET triggered the loop through automations. Now we do this all at once before we push to clients, but we don't trigger automation for it.
    # I think I need to to have some kind of flag to see if any of the automations rely on stackIndex or cardIndex
    # Enum.reduce(Enum.with_index(new_stack_ids), game, fn({stack_id, stack_index}, acc) ->
    #   stack = get_stack(game, stack_id)
    #   Enum.reduce(Enum.with_index(stack["cardIds"]), acc, fn({card_id, card_index}, acc2) ->
    #     Evaluate.evaluate(acc2, ["SET", "/cardById/" <> card_id <> "/stackIndex", stack_index], ["update_stack_ids stack_index:#{stack_index}"])
    #     |> Evaluate.evaluate(["SET", "/cardById/" <> card_id <> "/cardIndex", card_index], ["update_stack_ids card_index:#{card_index}"])
    #   end)
    # end)
  end

  def update_stack(game, new_stack) do
    Evaluate.evaluate(game, ["SET", "/stackById" <> "/" <> new_stack["id"], new_stack])
  end

  def update_card_ids(game, stack_id, new_card_ids) do
    Evaluate.evaluate(game, ["SET", "/stackById/" <> stack_id <> "/cardIds", ["LIST"] ++ new_card_ids])
  end

  def update_card(game, new_card) do
    Evaluate.evaluate(game, ["SET", "/cardById" <> "/" <> new_card["id"], new_card])
  end

  # Move a card
  def move_card(game, card_id, dest_group_id, dest_stack_index, dest_card_index, move_options \\ nil) do
    # Check if dest_group_id is a key in game["groupById"]
    if dest_group_id not in Map.keys(game["groupById"]) do
      raise "Group not found: #{dest_group_id}"
    end
    # Get position of card
    {orig_group_id, _orig_stack_index, _orig_card_index} = gsc(game, card_id)
    orig_stack_id = get_stack_by_card_id(game, card_id)["id"]
    # Pepare destination stack
    game = if get_in(move_options, ["combine"]) do
      dest_stack = get_stack_by_index(game, dest_group_id, dest_stack_index)
      add_to_stack(game, dest_stack["id"], card_id, dest_card_index)
    else
      new_stack = Stack.empty_stack() |> put_in(["cardIds"], [card_id])
      insert_new_stack(game, dest_group_id, dest_stack_index, new_stack)
  end

    game = game
    |> remove_from_stack(card_id, orig_stack_id)
    |> update_card_state(card_id, orig_group_id, move_options)
  end

  # Update a card state
  # Modify the card orientation/tokens based on where it is now
  def ucs_apply_dict(game, card_id, dict, allow_flip \\ true) do
    if dict != nil do
      Enum.reduce(dict, {game, []}, fn {key, val}, {acc_game, acc_paths} ->
        if key == "currentSide" and allow_flip == false do
          {acc_game, acc_paths}
        else
          new_game = put_in(acc_game, ["cardById", card_id, key], val)
          new_paths = acc_paths ++ ["/cardById/#{card_id}/#{key}"]
          {new_game, new_paths}
        end
      end)
    else
      {game, []}
    end
  end

  def ucs_apply_attachment_dir(game, card_id, move_options) do
    if move_options != nil and move_options["combine"] != nil do
      new_game = put_in(game, ["cardById", card_id, "attachmentDirection"], move_options["combine"])
      new_paths = ["/cardById/#{card_id}/attachmentDirection"]
      {new_game, new_paths}
    else
      {game, []}
    end
  end

  def ucs_card_position(game, card_id, dest_group_id, stack_id, dest_stack_index, dest_card_index, parent_card, move_options) do
    update_pathstrings = [
      "/cardById/#{card_id}/groupId",
      "/cardById/#{card_id}/stackId",
      "/cardById/#{card_id}/stackIndex",
      "/cardById/#{card_id}/cardIndex",
      "/cardById/#{card_id}/parentCardId"
    ]
    game = game
      |> put_in(["cardById", card_id, "groupId"], dest_group_id)
      |> put_in(["cardById", card_id, "stackId"], stack_id)
      |> put_in(["cardById", card_id, "stackIndex"], dest_stack_index)
      |> put_in(["cardById", card_id, "cardIndex"], dest_card_index)
      |> put_in(["cardById", card_id, "parentCardId"], parent_card["id"])

    if move_options != nil and move_options["combine"] != nil do
      attachment_direction = move_options["combine"]
      game = put_in(game, ["cardById", card_id, "attachmentDirection"], attachment_direction)
      update_pathstrings = update_pathstrings ++ ["/cardById/#{card_id}/attachmentDirection"]
      {game, update_pathstrings}
    else
      {game, update_pathstrings}
    end
  end

  def ucs_group_refresh(game, group_id, group) do
    if group_id != nil do
      Enum.reduce(Enum.with_index(group["stackIds"]), game, fn {stack_id, stack_index}, acc ->
        stack = get_stack(game, stack_id)
        Enum.reduce(Enum.with_index(stack["cardIds"]), acc, fn {card_id, card_index}, acc2 ->
          put_in(acc2["cardById"][card_id]["stackIndex"], stack_index)
          |> put_in(["cardById", card_id, "cardIndex"], card_index)
        end)
      end)
    else
      game
    end
  end

  def ucs_set_peeking(game, card_id, orig_group_id, dest_group_id, dest_group, old_card, allow_flip) do
    moving_to_facedown = dest_group["onCardEnter"]["currentSide"] == "B" and orig_group_id != dest_group_id
    will_flip = old_card["currentSide"] == "B" and dest_group["onCardEnter"]["currentSide"] == "A" and allow_flip
    if moving_to_facedown or will_flip do
      game = put_in(game, ["cardById", card_id, "peeking"], %{})
      update_pathstrings = ["/cardById/#{card_id}/peeking"]
      {game, update_pathstrings}
    else
      {game, []}
    end
  end

  def ucs_remove_tokens(game, card_id, card, orig_group, dest_group) do
    if orig_group["canHaveTokens"] != false and dest_group["canHaveTokens"] == false do
      Enum.reduce(card["tokens"], {game, []}, fn {key, _val}, {acc_game, acc_paths} ->
        new_game = put_in(acc_game, ["cardById", card_id, "tokens", key], 0)
        new_paths = acc_paths ++ ["/cardById/#{card_id}/tokens/#{key}"]
        {new_game, new_paths}
      end)
    else
      {game, []}
    end
  end

  def ucs_compute_allow_flip(move_options, orig_group, dest_group) do
    cond do
      move_options != nil and move_options["allowFlip"] == false ->
        false
      orig_group["onCardEnter"]["inPlay"] == true and dest_group["onCardEnter"]["inPlay"] == true ->
        false
      true ->
        true
    end
  end

  def update_card_state(game, card_id, orig_group_id \\ nil, move_options \\ nil) do
    # Set up some variables
    game_old = game
    {dest_group_id, dest_stack_index, dest_card_index} = gsc(game, card_id)
    {orig_group, dest_group} = {get_group(game, orig_group_id), get_group(game, dest_group_id)}
    old_card = get_card(game, card_id)
    card_name = old_card["sides"]["A"]["name"]
    allow_flip = ucs_compute_allow_flip(move_options, orig_group, dest_group)
    parent_card = get_card_by_group_id_stack_index_card_index(game, [dest_group_id, dest_stack_index, 0])
    stack_ids = game["groupById"][dest_group_id]["stackIds"]
    stack_id = Enum.at(stack_ids, dest_stack_index)

    # Apply onCardLeave first and resolve any triggers
    {game, cardleave_pathstrings} = ucs_apply_dict(game, card_id, orig_group["onCardLeave"], allow_flip)
    AutomationRules.apply_automation_rules_for_update_pathstrings(game, game_old, cardleave_pathstrings, ["cardById", card_id], ["cardleave_pathstrings:#{card_name}"])


    {game, position_pathstrings} = ucs_card_position(game, card_id, dest_group_id, stack_id, dest_stack_index, dest_card_index, parent_card, move_options)

    game = ucs_group_refresh(game, orig_group_id, orig_group)
    game = ucs_group_refresh(game, dest_group_id, dest_group)

    {game, peeking_pathstrings} = ucs_set_peeking(game, card_id, orig_group_id, dest_group_id, dest_group, old_card, allow_flip)

    {game, cardenter_pathstrings} = ucs_apply_dict(game, card_id, dest_group["onCardEnter"], allow_flip)

    {game, attachment_dir_pathstrings} = ucs_apply_attachment_dir(game, card_id, move_options)

    {game, token_pathstrings} = ucs_remove_tokens(game, card_id, old_card, orig_group, dest_group)

    update_pathstrings = cardleave_pathstrings ++ position_pathstrings ++ peeking_pathstrings ++ cardenter_pathstrings ++ token_pathstrings

    game = if is_map(game["ruleMap"]) and game["automationEnabled"] == true do
      AutomationRules.apply_automation_rules_for_update_pathstrings(game, game_old, update_pathstrings, ["cardById", card_id], ["apply_automation_rules_for_update_pathstrings:#{card_name}"])
    else
      game
    end

    game
  end

  # Delete card from game
  def delete_card(game, card_id) do
    card = get_card(game, card_id)
    game
    |> delete_card_from_rules_map(card_id)
    |> delete_card_from_card_by_id(card_id)
    |> remove_from_stack(card_id)
    |> refresh_stack_indices_in_group(card["groupId"])
  end

  def delete_card_from_rules_map(game, card_id) do
    card = get_card(game, card_id)
    old_rule_map = game["ruleMap"]
    new_rule_map = RuleMap.remove_rule_ids_from_map(old_rule_map, card["ruleIds"])
    Evaluate.evaluate(game, ["SET", "/ruleMap", new_rule_map], ["delete_card_from_rules_map cardId:#{card_id}"])
  end

  def delete_card_from_card_by_id(game, card_id) do
    old_card_by_id = game["cardById"]
    new_card_by_id = Map.delete(old_card_by_id, card_id)
    Evaluate.evaluate(game, ["SET", "/cardById", new_card_by_id], ["delete_card_from_card_by_id cardId:#{card_id}"])
  end

  # Removes a card from a stack, but it stays in cardById
  def remove_from_stack(game, card_id, stack_id) do
    old_card_ids = get_card_ids(game, stack_id)
    card_index = get_card_index_by_card_id(game, card_id, stack_id)
    new_card_ids = List.delete_at(old_card_ids, card_index)
    if Enum.count(new_card_ids) == 0 do
      delete_stack(game, stack_id)
    else
      update_card_ids(game, stack_id, new_card_ids)
    end
  end

  def remove_from_stack(game, card_id) do
    stack_id = get_stack_by_card_id(game, card_id)["id"]
    remove_from_stack(game, card_id, stack_id)
  end

  def refresh_stack_indices_in_group(game, group_id) do
    stack_ids = get_stack_ids(game, group_id)
    Enum.reduce(Enum.with_index(stack_ids), game, fn({stack_id, index}, acc) ->
      refresh_stack_indices_in_stack(acc, stack_id, index)
    end)
  end

  def refresh_stack_indices_in_stack(game, stack_id, index) do
    card_ids = get_card_ids(game, stack_id)
    Enum.reduce(card_ids, game, fn(card_id, acc) ->
      Evaluate.evaluate(acc, ["SET", "/cardById/" <> card_id <> "/stackIndex", index], ["refresh_stack_indices_in_stack cardId:#{card_id} stackIndex:#{index}"])
    end)
  end

  #################################################################
  # Stack actions                                                 #
  #################################################################

  def get_top_card_of_stack(game, stack_id) do
    stack = get_stack(game, stack_id)
    card_id = Enum.at(stack["cardIds"],0)
    get_card(game, card_id)
  end

  def delete_stack(game, stack_id) do
    game
    |> delete_stack_from_stack_by_id(stack_id)
    |> delete_stack_id_from_group_by_id(stack_id)
  end

  def delete_stack_from_stack_by_id(game, stack_id) do
    old_stack_by_id = game["stackById"]
    new_stack_by_id = Map.delete(old_stack_by_id, stack_id)
    Evaluate.evaluate(game, ["SET", "/stackById", new_stack_by_id])
  end

  def delete_stack_id_from_group_by_id(game, stack_id) do
    old_group = get_group_by_stack_id(game, stack_id)
    old_stack_ids = old_group["stackIds"]
    stack_index = get_stack_index_by_stack_id(game, stack_id)
    new_stack_ids = List.delete_at(old_stack_ids, stack_index)
    update_stack_ids(game, old_group["id"], new_stack_ids)
  end

  def add_to_stack(game, stack_id, card_id, card_index) do
    old_card_ids = get_card_ids(game, stack_id)
    new_card_ids = List.insert_at(old_card_ids, card_index, card_id)
    update_card_ids(game, stack_id, new_card_ids)
  end

  def update_stack_state(game, stack_id, orig_group_id, move_options) do
    # Update cards in stack one at a time in reverse order
    # This is so that when the stack is removed from play,
    # order is preserved as cards are detached
    dest_group = get_group_by_stack_id(game, stack_id)
    card_ids = get_card_ids(game, stack_id)
    game = Enum.reduce(card_ids, game, fn(card_id, acc) ->
      update_card_state(acc, card_id, orig_group_id, move_options)
    end)
    # If a stack is out of play, we need to split it up
    if Enum.count(card_ids)>1 && not dest_group["canHaveAttachments"] do
      reverse_card_ids = Enum.reverse(card_ids)
      Enum.reduce(reverse_card_ids, game, fn(card_id, acc) ->
        detach(acc, card_id)
      end)
    else
      game
    end
  end

  # Detach a card
  def detach(game, card_id) do
    # Get position of card and move it next to the initial stack
    {group_id, stack_index, _card_index} = gsc(game, card_id)
    move_card(game, card_id, group_id, stack_index + 1, 0)
  end

  def move_stack(game, stack_id, dest_group_id, dest_stack_index, options \\ nil) do
    if dest_group_id not in Map.keys(game["groupById"]) do
      raise "Group not found: #{dest_group_id}"
    end

    # Get list of card ids in stack
    card_ids = get_card_ids(game, stack_id)

    # Get list of cards
    cards = Enum.map(card_ids, fn(card_id) -> get_card(game, card_id) end)
    # Get list of card side A name
    card_side_a_names = Enum.map(cards, fn(card) -> card["sides"]["A"]["name"] end)
    orig_group_id = get_group_by_stack_id(game, stack_id)["id"]
    orig_stack_index = get_stack_index_by_stack_id(game, stack_id)
    # If destination is negative, count backward from the end
    dest_stack_index = if dest_stack_index < 0 do
      loop_index = Enum.count(GameUI.get_stack_ids(game, dest_group_id)) + dest_stack_index
      if get_in(options, ["combine"]) do
        loop_index
      else
        loop_index + 1
      end
    else
      dest_stack_index
    end
    Logger.debug("Moving stack: #{card_side_a_names} #{dest_group_id} #{dest_stack_index}")
    # If attaching to same group at higher index, dest_index will end up being 1 less
    dest_stack_index = if orig_group_id == dest_group_id and options["combine"] != nil and orig_stack_index < dest_stack_index do dest_stack_index - 1 else dest_stack_index end
    # Delete stack id from old group
    old_orig_stack_ids = get_stack_ids(game, orig_group_id)
    new_orig_stack_ids = List.delete_at(old_orig_stack_ids, orig_stack_index)
    game = update_stack_ids(game, orig_group_id, new_orig_stack_ids)
    # Add to new position
    if options["combine"] != nil do
      # Get existing destination stack
      dest_stack = get_stack_by_index(game, dest_group_id, dest_stack_index)
      dest_stack_id = dest_stack["id"]
      # Update card ids of destination stack
      old_orig_card_ids = get_card_ids(game, stack_id)
      old_dest_card_ids = get_card_ids(game, dest_stack["id"])
      new_dest_card_ids = old_dest_card_ids ++ old_orig_card_ids
      game = update_card_ids(game, dest_stack_id, new_dest_card_ids)
      # Delete original stack
      game = delete_stack_from_stack_by_id(game, stack_id)
      Enum.reduce(old_orig_card_ids, game, fn(card_id, acc) ->
        update_card_state(acc, card_id, orig_group_id, options)
      end)
      #update_stack_state(game, dest_stack_id, orig_group_id, options)
    else
      # Update destination group stack ids
      old_dest_stack_ids = get_stack_ids(game, dest_group_id)
      new_dest_stack_ids = List.insert_at(old_dest_stack_ids, dest_stack_index, stack_id)
      update_stack_ids(game, dest_group_id, new_dest_stack_ids)
      |> update_stack_state(stack_id, orig_group_id, options)
    end
  end

  def move_stacks(game, orig_group_id, dest_group_id, top_n, position, options \\ nil) do
    orig_stack_ids = get_stack_ids(game, orig_group_id)
    # Moving stacks to the top or the bottom of the new group?
    top_n = if top_n == -1 do Enum.count(orig_stack_ids) else top_n end
    dest_stack_index = if position == "bottom" do -1 else 0 end
    # Move stacks 1 at a time
    game = Enum.reduce(Enum.with_index(orig_stack_ids), game, fn({stack_id, index}, acc) ->
      if index < top_n do
        move_stack(acc, stack_id, dest_group_id, dest_stack_index, options)
      else
        acc
      end
    end)
    # Do we shuffle it in?
    if position == "shuffle" do shuffle_group(game, dest_group_id) else game end
  end

  def insert_card_in_stack(game, stack_id, card_id, index) do
    old_card_ids = game["stackById"][stack_id]["cardIds"]
    new_card_ids = List.insert_at(old_card_ids, index, card_id)
    update_card_ids(game, stack_id, new_card_ids)
  end

  #################################################################
  # Group actions                                                 #
  #################################################################

  def insert_new_stack(game, group_id, stack_index, stack) do
    old_stack_ids = get_stack_ids(game, group_id)
    new_stack_ids = List.insert_at(old_stack_ids, stack_index, stack["id"])
    game
    |> update_stack(stack)
    |> update_stack_ids(group_id, new_stack_ids)
  end

  def insert_stack_in_group(game, group_id, stack_id, index) do
    old_stack_ids = get_stack_ids(game, group_id)
    new_stack_ids = List.insert_at(old_stack_ids, index, stack_id)
    update_stack_ids(game, group_id, new_stack_ids)
  end

  def set_stack_left_top(game, stack_id, left, top) do
    game = game
    |> put_in(["stackById", stack_id, "left"], left)
    |> put_in(["stackById", stack_id, "top"], top)
  end

  ################################################################
  # Game actions                                                 #
  ################################################################

  def game_action(gameui, user_id, action, options) do
    Logger.debug("game_action #{user_id} #{action} #{inspect(options)}")
    game_old = gameui["game"]

    game_new = game_old
      |> put_in(["playerUi"], options["player_ui"])
      |> put_in(["playerInfo"], gameui["playerInfo"])

    game_new = game_new
      |> put_in(["messages"], [])

    game_new = game_new
      |> resolve_action_type(action, options, user_id)

    # game_new = if game_new["roundNumber"] > game_old["roundNumber"] do
    #   game_new = game_new
    #   |> put_in(["playerUi"], options["player_ui"])
    #   |> put_in(["playerInfo"], gameui["playerInfo"])
    #   save_replay(game_new, user_id)
    # else
    #   game_new
    # end

    game_new = game_new
      |> Map.delete("playerUi")
      |> Map.delete("playerInfo")

    game_new = game_new
      |> put_in(["variables"], GameVariables.default())

    # game_new = game_new
    #   |> assign_stack_and_card_indices()


    gameui = gameui
    |> put_in(["game"], game_new)

    # gameui = gameui
    # |> update_log(game_new["messages"])

    gameui
  end

  def resolve_action_type(game, type, options, user_id) do
    case type do
      "evaluate" ->
        Evaluate.evaluate_with_timeout(game, options["action_list"])
      "set_game" ->
        options["game"]
      "reset_game" ->
        reset_game(game, user_id, options["action_list"])
      "close_room" ->
        close_room(game, user_id, options["action_list"])
      _ ->
        game
    end
  end

  def reset_card_trigger_status(game) do
    card_by_id = game["cardById"]
    card_by_id = Enum.reduce(card_by_id, %{}, fn({card_id, card}, acc) ->
      card = put_in(card["triggeredTimeStamp"], nil)
      acc |> put_in([card_id], card)
    end)
    put_in(game["cardById"], card_by_id)
  end

  def assign_stack_and_card_indices(game) do
    group_ids = Map.keys(game["groupById"])
    card_by_id = game["cardById"]
    card_by_id = Enum.reduce(group_ids, card_by_id, fn(group_id, acc) ->
      stack_ids = get_stack_ids(game, group_id)
      Enum.reduce(Enum.with_index(stack_ids), acc, fn({stack_id, stack_index}, acc2) ->
        card_ids = get_card_ids(game, stack_id)
        Enum.reduce(Enum.with_index(card_ids), acc2, fn({card_id, card_index}, acc3) ->
          card = get_card(game, card_id)
          |> put_in(["stackIndex"], stack_index)
          |> put_in(["cardIndex"], card_index)
          acc3 |> put_in([card_id], card)
        end)
      end)
    end)
    game |> put_in(["cardById"], card_by_id)
  end

  def update_log(gameui, messages) do
    gameui
  end

  def add_delta(gameui, prev_gameui) do
    game = gameui["game"]
    prev_game = prev_gameui["game"]
    ds = gameui["deltas"]
    prev_replay_step = prev_gameui["replayStep"]
    new_replay_step = prev_replay_step+1
    gameui = put_in(gameui["replayStep"], new_replay_step)
    d = get_delta(prev_game, game)
    gameui = if d do
      # add timestamp to delta
      timestamp = System.system_time(:millisecond)
      d = put_in(d["_delta_metadata"], %{"unix_ms" => "#{timestamp}", "log_messages" => game["messages"]})
      ds = if prev_replay_step == -1 do
        []
      else
        Enum.slice(ds, 0..prev_replay_step)
      end
      ds = ds ++ [d]
      put_in(gameui["deltas"], ds)
    else
      gameui
    end
    gameui
  end

  def step(gameui, direction) do
    case direction do
      "undo" ->
        undo(gameui)
      "redo" ->
        redo(gameui)
      _ ->
        gameui
    end
  end

  def undo(%{"replayStep" => replay_step, "deltas" => deltas, "game" => game} = gameui) do
    if replay_step >= 0 do
      delta = Enum.at(deltas, replay_step)
      game = apply_delta(game, delta, "undo")
      gameui
        |> put_in(["game"], game)
        |> put_in(["replayStep"], replay_step-1)
    else
      gameui
    end
  end

  def redo(%{"replayStep" => replay_step, "deltas" => deltas, "game" => game} = gameui) do
    if replay_step < Enum.count(deltas)-1 do
      delta = Enum.at(deltas, replay_step+1)
      game = apply_delta(game, delta, "redo")
      gameui
        |> put_in(["game"], game)
        |> put_in(["replayStep"], replay_step+1)
    else
      gameui
    end
  end

  def get_delta(game_old, game_new) do
    game_old = Map.delete(game_old, "messages")
    diff_map = MapDiff.diff(game_old, game_new)
    delta("game", diff_map)
  end

  def delta(_key, diff_map) do
    case diff_map[:changed] do
      :equal ->
        nil
      :added ->
        [":removed", diff_map[:value]]
      # TODO: Check that removal behaves properly
      :removed ->
        [diff_map[:value], ":removed"]
      :primitive_change ->
        [diff_map[:removed],diff_map[:added]]
      :map_change ->
        diff_value = diff_map[:value]
        Enum.reduce(diff_value, %{}, fn({k,v},acc) ->
          d2 = delta(k, v)
          if v[:changed] != :equal and k != "playerUi" do
            acc |> Map.put(k, d2)
          else
            acc
          end
        end)
        _ ->
          nil
    end
  end

  def apply_delta(map, delta, direction) do
    if is_map(map) and is_map(delta) do
      delta = Map.delete(delta, "_delta_metadata")
      # Loop over keys in delta and apply the changes to the map
      Enum.reduce(delta, map, fn({k, v}, acc) ->
        if is_map(v) do
          put_in(acc[k], apply_delta(map[k], v, direction))
        else
          new_val = if direction == "undo" do
            Enum.at(v,0)
          else
            Enum.at(v,1)
          end
          if new_val == ":removed" do
            Map.delete(acc, k)
          else
            put_in(acc[k], new_val)
          end
        end
      end)
    else
      map
    end
  end

  def apply_delta_list(game, delta_list, direction) do
    Enum.reduce(delta_list, game, fn(delta, acc) ->
      apply_delta(acc, delta, direction)
    end)
  end

  def apply_deltas_until_index(gameui, target_replay_index) do
    deltas = gameui["deltas"]
    initial_replay_index = gameui["replayStep"]
    cond do
      target_replay_index < initial_replay_index ->
        Enum.reduce_while(deltas, gameui, fn(_delta, acc) ->
          replay_step = acc["replayStep"]
          cond do
            replay_step == target_replay_index ->
              {:halt, acc}
            true ->
              {:cont, step(acc, "undo")}
          end
        end)
      target_replay_index > initial_replay_index ->
        Enum.reduce_while(deltas, gameui, fn(_delta, acc) ->
          replay_step = acc["replayStep"]
          cond do
            replay_step == target_replay_index ->
              {:halt, acc}
            true ->
              {:cont, step(acc, "redo")}
          end
        end)
      true ->
        gameui
    end
  end

  def apply_deltas_until_round_change(gameui, direction) do
    deltas = gameui["deltas"]
    round_init = gameui["roundNumber"]
    Enum.reduce_while(deltas, gameui, fn(_delta, acc) ->
      replay_step = acc["replayStep"]
      # Check if we run into the beginning/end
      cond do
        direction == "undo" and replay_step == 0 ->
          {:halt, acc}
        direction == "redo" and replay_step == Enum.count(deltas) ->
          {:halt, acc}
      # Check if round has changed
        acc["roundNumber"] != round_init ->
          {:halt, acc}
      # Otherwise continue
        true ->
          {:cont, step(acc, direction)}
      end
    end)
  end

  def get_player_n(game) do
    if Evaluate.evaluate(game, ["DEFINED", "$PLAYER_N"], ["DEFINE get_player_n"]) do
      Evaluate.evaluate(game, "$PLAYER_N", ["$PLAYER_N"])
    else
      nil
    end
  end

  def get_user_id_from_player_n(game, player_n) do
    game["playerInfo"][player_n]["id"]
  end

  def get_alias_n(game) do
    player_n = get_player_n(game)
    if player_n do
      Evaluate.evaluate(game, "$ALIAS_N", ["get_alias_n"])
    else
      "Host"
    end
  end

  def get_alias_by_user_id(game, user_id) do
    game["playerInfo"]
    |> Enum.find(fn {_, player_info} -> player_info["id"] == user_id end)
    |> case do
      nil -> nil
      {_, player_info} -> player_info["alias"]
    end
  end

  def get_player_n_by_user_id(gameui, user_id) do
    if user_id == nil or gameui["playerInfo"] == nil do
      nil
    else
      gameui["playerInfo"]
      |> Enum.find(fn {_, player_info} -> player_info["id"] == user_id end)
      |> case do
        nil -> nil
        {player_n, _} -> player_n
      end
    end
  end

  def does_user_save_full_replay(user_id) do
    supporter_level = Users.get_supporter_level(user_id)
    supporter_level >= 3
  end

  def trim_saved_deltas(deltas, user_id) do
    save_full_replay = Users.get_replay_save_permission(user_id)

    if save_full_replay do
      deltas
    else
      start_index = if Enum.count(deltas) > 5 do
        Enum.count(deltas)-5
      else
        0
      end
      Enum.slice(deltas, start_index..-1)
    end
  end

  def save_replay(gameui, user_id, options) do
    if user_id == nil do
      {:error, "Error saving game: user not recognized."}
    else
      game = gameui["game"]
      game = game
        |> put_in(["playerUi"], options["player_ui"])
        |> put_in(["playerInfo"], gameui["playerInfo"])

      game_uuid = game["id"]

      deltas = gameui["deltas"] |> trim_saved_deltas(user_id)

      game_def = PluginCache.get_game_def_cached(game["options"]["pluginId"])
      save_metadata = get_in(game_def, ["saveGame", "metadata"])

      updates = %{
        game_json: game,
        metadata: if save_metadata == nil do nil else Evaluate.evaluate(game, ["PROCESS_MAP", save_metadata], ["save_replay"]) end,
        plugin_id: game["pluginId"],
        deltas: deltas,
      }

      result = case Repo.get_by(Replay, [user_id: user_id, uuid: game_uuid]) do
        nil  -> %Replay{user_id: user_id, uuid: game_uuid} # Replay not found, we build one
        replay -> replay  # Replay exists, let's use it
      end

      result = result
      |> Replay.changeset(updates)
      |> Repo.insert_or_update

      # Check if it worked
      case result do
        {:ok, _struct} ->
          Logger.debug("Insert or update was successful!")

        {:error, changeset} ->
          Logger.debug("An error occurred:")
          Logger.debug(inspect(changeset.errors)) # Print the errors
      end

      case Users.get_replay_save_permission(user_id) do
        true ->
          {:ok, "Full replay saved."}
        false ->
          {:ok, "Current game saved. To save full replays, become a supporter."}
      end
    end
  end


  def set_last_room_update(gameui) do
    if rem(Enum.count(gameui["deltas"]), 20) == 0 do
      timestamp = System.system_time(:second)
      room = Repo.get_by(Room, [slug: gameui["roomSlug"]])
      if room do
        updates = %{
          last_update: timestamp,
          name: gameui["game"]["roomSlug"],
          num_players: gameui["game"]["numPlayers"]
        }
        room
        |> Room.changeset(updates)
        |> Repo.insert_or_update
      end
    end
  end


  def step_through(gameui, options) do
    size = options["size"]

    cond do
      size == "single" ->
        step(gameui, options["direction"])
      size == "round" ->
        apply_deltas_until_round_change(gameui, options["direction"])
      size == "index" ->
        apply_deltas_until_index(gameui, options["index"])
      true ->
        gameui
    end
  end

  def reset_game(game, user_id, action_list) do
    game_old = game
    game_def = PluginCache.get_game_def_cached(game["options"]["pluginId"])
    game = Evaluate.evaluate_with_timeout(game, action_list)
    #game = save_replay(game, user_id)
    game = Game.new(game["roomSlug"], user_id, game_def, game["options"])
  end

  def close_room(game, user_id, action_list) do
    game_old = game
    game = Evaluate.evaluate_with_timeout(game, action_list)
    #game = save_replay(game, user_id)
    Evaluate.evaluate(game, ["LOG", get_alias_n(game_old), " closed the room."])
  end

  # def create_card_in_group(game, game_def, group_id, load_list_item) do
  #   group_size = Enum.count(get_stack_ids(game, group_id))
  #   # Can't insert a card directly into a group need to make a stack first
  #   new_card = Card.card_from_card_details(load_list_item["cardDetails"], game_def, load_list_item["databaseId"], group_id)
  #   new_stack = Stack.stack_from_card(new_card)
  #   game
  #   |> update_card(new_card)
  #   |> update_stack(new_stack)
  #   |> insert_stack_in_group(group_id, new_stack["id"], group_size)
  #   |> set_stack_left_top(new_stack["id"], load_list_item["left"], load_list_item["top"])
  #   |> implement_card_automations(game_def, new_card)
  #   |> update_card_state(new_card["id"], nil, nil)
  #   |> Evaluate.evaluate(["SET", "/loadedCardIds", ["LIST"] ++ game["loadedCardIds"] ++ [new_card["id"]]], ["create_card_in_group"])

  # end

  def create_card_in_group(game, game_def, group_id, load_list_item) do
    group_size = Enum.count(get_stack_ids(game, group_id))

    new_card = Card.card_from_card_details(load_list_item["cardDetails"], game_def, load_list_item["databaseId"], group_id)
    new_stack = Stack.stack_from_card(new_card)

    game = update_card(game, new_card)

    game = update_stack(game, new_stack)

    game = insert_stack_in_group(game, group_id, new_stack["id"], group_size)

    game = set_stack_left_top(game, new_stack["id"], load_list_item["left"], load_list_item["top"])

    game = AutomationRules.implement_card_rules(game, game_def, new_card)

    game = update_card_state(game, new_card["id"], nil, nil)

    game = Evaluate.evaluate(
      game,
      ["SET", "/loadedCardIds", ["LIST"] ++ game["loadedCardIds"] ++ [new_card["id"]]],
      ["create_card_in_group"]
    )

    game
  end


  # def tba() do
  #   if rule["type"] == "onChange" do
  #     dtc = define_this_card(card_id)
  #     val = %{
  #       "key" => dtc ++ [rule["key"]],
  #       "before" => dtc ++ [rule["before"]],
  #       "after" => dtc ++ [rule["after"]],
  #       "then" => dtc ++ [rule["then"]],
  #     }
  #     game = Evaluate.evaluate(game, define_this_card(card_id))
  #     path = Evaluate.evaluate(game, rule["path"])
  #     if Evaluate.evaluate(game, ["GAME_GET_VAL", path ++ ["_automate_"]]) do
  #       Evaluate.evaluate(game, ["SET"] ++ path ++ ["_automate_", card_id, val])
  #     else
  #       Evaluate.evaluate(game, ["SET"] ++ path ++ ["_automate_", %{card_id => val}])
  #     end
  #   end
  # end

  def do_automation_action_list(game, action_list_id, trace) do
    # Run postLoadActionList if it exists
    game_def = PluginCache.get_game_def_cached(game["options"]["pluginId"])
    automation_action_list = game_def["automation"][action_list_id]
    game = if automation_action_list do
      if game["automationEnabled"] == true do
        Evaluate.evaluate(game, automation_action_list, trace ++ ["action_list_id"])
      else
        Evaluate.evaluate(game, ["LOG", "Skipping automation action list ", action_list_id, " because automation is disabled."], trace ++ ["action_list_id"])
      end
    else
      game
    end
  end


  def load_card(game, game_def, load_list_item) do
    quantity = load_list_item["quantity"]
    if quantity <= 0 do
      game
    else
      group_id = load_list_item["loadGroupId"]

      1..quantity
      |> Enum.reduce(game, fn(_index, acc) ->
        create_card_in_group(acc, game_def, group_id, load_list_item)
      end)
    end
  end

  def shuffle_changed_decks(new_game, old_game, game_def) do
    new_game["groupById"]
    |> Enum.reduce(new_game, fn({group_id, group}, acc) ->
      old_stack_ids = get_stack_ids(old_game, group_id)
      new_stack_ids = get_stack_ids(new_game, group_id)
      # Check if the number of stacks in the deck has changed, and if so, we shuffle
      if group["shuffleOnLoad"] && length(old_stack_ids) != length(new_stack_ids) do
        acc = shuffle_group(acc, group_id)
        Evaluate.evaluate(acc, ["LOG", get_alias_n(new_game), " shuffled ", l10n(acc, game_def, group["label"]), "."], [])
      else
        acc
      end
    end)
  end

  def l10n(game, game_def, label) do
    # Check if label starts with "id:"
    if String.starts_with?(label, "id:") do
      label_id = String.slice(label, 3..-1)
      language = game["options"]["language"]
      case get_in(game_def["labels"][label_id], [language]) do
        nil -> label
        val -> val
      end
    else
      label
    end
  end

  def shuffle_group(gameui, group_id) do
    shuffled_stack_ids = get_stack_ids(gameui, group_id) |> Enum.shuffle
    update_stack_ids(gameui, group_id, shuffled_stack_ids)
  end

  def load_cards(game, load_list) do
    player_n = get_player_n(game)
    user_id = get_user_id_from_player_n(game, player_n)

    # If load_list is nil, raise an error
    if load_list == nil do
      raise "load_list is nil"
    end

    Logger.debug("load_cards 1")

    game_def = DragnCardsGame.PluginCache.get_game_def_cached(game["options"]["pluginId"])

    Logger.debug("load_cards 2")

    # {card_db_time, card_db} = :timer.tc(fn -> Plugins.get_card_db(game["options"]["pluginId"]) end)
    # IO.puts("get_card_db execution time: #{card_db_time} microseconds")

    card_db = DragnCardsGame.PluginCache.get_card_db_cached(game["options"]["pluginId"])


    Logger.debug("load_cards 3")

    load_list = Enum.map(load_list, fn load_list_item ->
      # If the load_list_item has a "cardDetails"
      database_id = get_in(load_list_item, ["databaseId"])

      cardDetails =
        cond do
          Map.has_key?(load_list_item, "cardDetails") ->
            load_list_item["cardDetails"]

          Map.has_key?(load_list_item, "authorId") ->
            IO.puts("'authorId' was found in load_list_item. Attempting to load card from custom database.")
            CustomCardDb.get_card_details_for_user(game["pluginId"], user_id, database_id)

          database_id != nil ->
            card_details = {:ok, card_db[database_id]}
            case card_details do
              {:ok, nil} -> raise "Card with databaseId #{database_id} not found."
              {:ok, card_details} -> card_details
              :error -> raise "Card with databaseId #{database_id} not found."
            end

          true ->
            raise "Map must contain either 'databaseId' or 'cardDetails'"
        end

      quantity = Map.fetch!(load_list_item, "quantity")

      loadGroupId = Map.fetch!(load_list_item, "loadGroupId")

      loadGroupId =
        if String.contains?(loadGroupId, "playerN") and player_n == nil do
          raise "Tried to load a card into player group #{loadGroupId}, but no player was specified. Are you sitting in a seat?"
        else
          String.replace(loadGroupId, "playerN", player_n || "")
        end

      possibleGroupIds = Map.keys(game["groupById"])

      if loadGroupId not in possibleGroupIds do
        raise "Tried to load a card into a group that doesn't exist: #{loadGroupId}"
      end

      %{
        "databaseId" => database_id,
        "cardDetails" => cardDetails,
        "quantity" => quantity,
        "loadGroupId" => loadGroupId,
        "left" => load_list_item["left"],
        "top" => load_list_item["top"]
      }
    end)

    Logger.debug("load_cards 4")

    old_game = game

    game = Evaluate.evaluate(game, ["SET", "/loadedCardIds", []])

    {reduce_load_list_time, game} = :timer.tc(fn ->
      Enum.reduce(load_list, game, fn load_list_item, acc ->
        load_card(acc, game_def, load_list_item)
      end)
    end)
    IO.puts("Enum.reduce (load_list processing) execution time: #{reduce_load_list_time} microseconds")

    game = shuffle_changed_decks(game, old_game, game_def)

    game
  end


  # def load_cards(game, load_list) do
  #   player_n = get_player_n(game)
  #   user_id = get_user_id_from_player_n(game, player_n)

  #   # If load_list is nil, raise an error
  #   if load_list == nil do
  #     raise "load_list is nil"
  #   end
  #   Logger.debug("load_cards 1")
  #   game_def = Plugins.get_game_def(game["options"]["pluginId"])
  #   Logger.debug("load_cards 2")
  #   card_db = Plugins.get_card_db(game["options"]["pluginId"])
  #   Logger.debug("load_cards 3")

  #   # Loop over load list and add a "cardDetails" field to each item
  #   load_list = Enum.map(load_list, fn load_list_item ->
  #     # If the load_list_item has a "cardDetails"
  #     database_id = get_in(load_list_item, ["databaseId"])

  #     cardDetails =
  #       cond do
  #         Map.has_key?(load_list_item, "cardDetails") ->
  #           load_list_item["cardDetails"]

  #         Map.has_key?(load_list_item, "authorId") ->
  #           IO.puts("'authorId' was found in load_list_item. Attempting to load card from custom database.")
  #           CustomCardDb.get_card_details_for_user(game["pluginId"], user_id, database_id)

  #         database_id != nil ->
  #           case Map.fetch(card_db, database_id) do
  #             {:ok, card_details} -> card_details
  #             :error -> raise "Card with databaseId #{database_id} not found."
  #           end

  #         true ->
  #           raise "Map must contain either 'databaseId' or 'cardDetails'"
  #       end

  #     quantity = Map.fetch!(load_list_item, "quantity")

  #     loadGroupId = Map.fetch!(load_list_item, "loadGroupId")

  #     loadGroupId =
  #     if String.contains?(loadGroupId, "playerN") and player_n == nil do
  #       raise "Tried to load a card into player group #{loadGroupId}, but no player was specified. Are you sitting in a seat?"
  #     else
  #       String.replace(loadGroupId, "playerN", player_n || "")
  #     end

  #     possibleGroupIds = Map.keys(game["groupById"])

  #     if loadGroupId not in possibleGroupIds do
  #       raise "Tried to load a card into a group that doesn't exist: #{loadGroupId}"
  #     end

  #     %{
  #       "databaseId" => database_id,
  #       "cardDetails" => cardDetails,
  #       "quantity" => quantity,
  #       "loadGroupId" => loadGroupId,
  #       "left" => load_list_item["left"],
  #       "top" => load_list_item["top"]
  #     }
  #   end)
  #   Logger.debug("load_cards 4")

  #   old_game = game

  #   game = Evaluate.evaluate(game, ["SET", "/loadedCardIds", []])

  #   game =
  #     Enum.reduce(load_list, game, fn load_list_item, acc ->
  #       Logger.debug("load_card #{load_list_item["cardDetails"]["A"]["name"]} into #{load_list_item["loadGroupId"]}")
  #       load_card(acc, game_def, load_list_item)
  #     end)
  #   # rescue
  #   #   e in RuntimeError ->
  #   #     Evaluate.evaluate(game, ["ERROR", "Loading cards: #{Exception.message(e)}"])
  #   # end

  #   game = Game.sort_game_automation_list(game)


  #   shuffle_changed_decks(game, old_game, game_def)

  # end

end
