defmodule DragnCardsWeb.PowMailer do
  @moduledoc """
  Interface for Pow to send Emails with.  Uses Swoosh.
  """
  use Pow.Phoenix.Mailer
  use Swoosh.Mailer, otp_app: :dragncards

  import Swoosh.Email

  require Logger

  def cast(%{user: user, subject: subject, text: text, html: html}) do
    %Swoosh.Email{}
    |> to({"", user.email})
    |> from({"DragnCards", "postmaster@noreply.dragncards.com"})
    |> subject(subject)
    |> html_body(html)
    |> text_body(text)
  end

  # def process(email) do
  #   Logger.info("E-mail sent: #{inspect(email)}")
  # end

  def process(email) do
    email
    |> deliver()
    |> log_warnings()
  end

  defp log_warnings({:error, reason}) do
    Logger.warning("Mailer backend failed with: #{inspect(reason)}")
  end

  defp log_warnings({:ok, response}), do: {:ok, response}
end
