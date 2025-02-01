defmodule DragnCardsGame.GameUIView do
  @moduledoc """
  One level on top of GameUI.
  Considers which user id we're sending info to
  and shows certain things if appropriate.
  """
  alias DragnCardsGame.{GameUI, GameUIView}

  @derive Jason.Encoder
  defstruct [
    :game_ui,
    :my_seat
  ]

  @type t :: %GameUIView{
          game_ui: GameUI.t(),
          my_seat: nil | :player1 | :player2 | :player3 | :player4
        }

  @spec view_for(nil | GameUI.t(), integer) :: GameUIView.t()
  def view_for(nil, _user_id), do: nil

  def view_for(%{} = game_ui, user_id) do
    # In the future, this could be used to limit the information that is given to each player to avoid cheating.
    # For example, using some function game_ui: GameUI.censor(game_ui)

    %GameUIView{
      game_ui: game_ui,
      my_seat: seat_for(game_ui, user_id)
    }
  end

  def seat_for(%{} = game_ui, user_id) do
    cond do
      user_id == game_ui.seats.player1.sitting ->
        :player1

      user_id == game_ui.seats.player2.sitting ->
        :player2

      user_id == game_ui.seats.player3.sitting ->
        :player3

      user_id == game_ui.seats.player4.sitting ->
        :player4

      true ->
        nil
    end
  end
end
