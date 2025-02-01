defmodule DragnCardsUtil.ConvertType do


  @spec convert_to_integer(String.t() | nil) :: number
  def convert_to_integer(my_string) do
    if my_string == nil do
      nil
    else
      result = Integer.parse("#{my_string}")
      case result do
        {number, _} -> number
        :error -> 0
      end
    end
  end

  @spec convert_to_boolean(String.t() | nil) :: boolean
  def convert_to_boolean(my_string) do
    if my_string == nil do
      nil
    else
      result = String.downcase(my_string)
      case result do
        "true" -> true
        "false" -> false
        "0" -> false
        "1" -> true
        _ -> nil
      end
    end
  end

  @spec convert_to_string(String.t() | nil) :: String.t()
  def convert_to_string(my_string) do
    if my_string == nil do
      ""
    else
      my_string
    end
  end

  @spec convert_to_float(String.t() | nil) :: Map.t()
  def convert_to_float(my_string) do
    if my_string == nil do
      nil
    else
      result = Float.parse("#{my_string}")
      case result do
        {number, _} -> number
        :error -> 0.0
      end
    end
  end

  @spec convert_to_map(String.t() | nil) :: Map.t()
  def convert_to_map(my_string) do
    if my_string == nil do
      %{}
    else
      case Jason.decode(my_string) do
        {:ok, map} -> map
        _ -> raise "Couldn't convert string #{my_string} to map"
      end
    end
  end

  @spec convert_to_list(String.t() | nil) :: List.t()

  def convert_to_list(my_string) do
    if my_string == nil do
      []
    else
      case Jason.decode(my_string) do
        {:ok, list} -> list
        _ -> raise "Couldn't convert string #{my_string} to list"
      end
    end
  end

end
