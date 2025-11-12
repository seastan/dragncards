defmodule DragnCardsGame.Stack do
  @moduledoc """
  Represents a stack of cards. Most of the time it contains just 1 card, but can have multiple attached cards.
  """
  alias DragnCardsGame.{Card}
  require Logger

  @type t :: Map.t()

  @spec empty_stack(String.t()) :: Map.t()
  def empty_stack(card_id \\ "empty") do
    random_suffix = :crypto.strong_rand_bytes(6) |> Base.url_encode64(padding: false) |> String.downcase()
    %{
      "id" => "s_#{random_suffix}_#{card_id}",
      "cardIds" => []
    }
  end

  @spec stack_from_card(Card.t()) :: Map.t()
  def stack_from_card(card) do
    card_id = card["id"]
    random_suffix = :crypto.strong_rand_bytes(6) |> Base.url_encode64(padding: false) |> String.downcase()
    %{
      "id" => "s_#{random_suffix}_#{card_id}",
      "cardIds" => [card_id]
    }
  end
end
