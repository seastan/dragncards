defmodule DragnCardsChat.ChatMessage do
  @moduledoc """
  Represents a seat at a table.
  The integers here are user ids.
  """

  @derive Jason.Encoder
  defstruct [:text, :sent_by, :when, :shortcode, :game_update]

  use Accessible


  @spec new(String.t(), integer | nil) :: map()
  def new(text, sent_by) do
    time_unix_ms = System.system_time(:millisecond)
    %{
      "text" => text,
      "sent_by" => sent_by,
      "when" => time_unix_ms,
      "shortcode" => shortcode()
    }
  end

  defp shortcode() do
    :crypto.strong_rand_bytes(6) |> Base.url_encode64()
  end
end
