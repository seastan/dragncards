defmodule DragnCardsUtil.StringMath do
  alias DragnCardsUtil.{ConvertType}
  @doc """
  Evaluates a mathematical expression represented as a string.

  Supported operators: +, -, *, /
  Supported operands: digits, floating-point numbers, and parentheses

  Examples:
  iex> ExpressionEvaluator.evaluate("0.5+(2+4)*3/5")
  7.2
  iex> ExpressionEvaluator.evaluate("1 + 2 - 3 * 4.2 / 5")
  -5.72
  """

  def is_operator(token) when token in ["+", "-", "*", "/", "^"], do: true
  def is_operator(_), do: false

  def merge_negative_sign(tokens) do
    Enum.reduce(Enum.with_index(tokens), [], fn({token, index}, acc) ->
      prev_token = if index > 0 do Enum.at(tokens, index - 1) else nil end
      prev_prev_token = if index > 1 do  Enum.at(tokens, index - 2) else nil end
      case {!is_operator(token), prev_token == "-", is_operator(prev_prev_token) or prev_prev_token == nil} do
        {true, true, true} ->
          # Remove the prev element ("-") from acc
          acc = Enum.slice(acc, 0, length(acc) - 1)
          acc ++ ["-#{token}"]
        _ ->
          acc ++ [token]
      end
    end)
  end

  def remove_whitespace(expression) do
    Regex.replace(~r/\s/u, expression, "")
  end

  def insert_implicit_multiplication(expression) do
    # Replace instances where "(" is not preceded by operators with "*("
    replaced = Regex.replace(~r/(?<![\+\-\*\/\^])\(/, expression, "*(")
    # If the first character is now a "*", drop it
    if String.starts_with?(replaced, "*") do
      String.slice(replaced, 1..-1)
    else
      replaced
    end
  end

  def string_to_tokens(expression) do
    # If there is any character besides a number or an operator, raise an error
    if Regex.match?(~r/[^0-9\.\+\-\*\/\^\(\)]/u, expression) do
      raise "Invalid character in expression: #{expression}"
    end
    split_by_op = String.split(expression, ~r/[\^+\-*\/]/u, include_captures: true)
    # Drop empty strings
    split_by_op = Enum.filter(split_by_op, fn x -> x != "" end)
    # Merge negative signs
    merge_negative_sign(split_by_op)
  end

  def evaluate_string(expression) do
    try do
      expression = remove_whitespace(expression)
      expression = insert_implicit_multiplication(expression)
      result = compute_parentheses_inside_out(expression)
      tokens = string_to_tokens(result)
      final_result = evaluate_tokens(tokens)
      {float_result, _} = Float.parse(final_result)
      {int_result, _} = Integer.parse(final_result)
      # If the float result is an integer, return it as an integer
      if int_result == float_result do
        int_result
      else
        float_result
      end
    rescue
      _ -> raise "Invalid expression: #{expression}"
    end
  end

  def compute_parentheses_inside_out(input) do
    case Regex.scan(~r/\([^()]*\)/, input) do
      [] ->
        # No more parentheses to process, return the accumulated result
        input
      [[match] | _] ->
        # Found innermost parentheses, apply function and replace
        inner_content = String.slice(match, 1..-2) # Remove parentheses
        inner_tokens = string_to_tokens(inner_content)
        processed = evaluate_tokens(inner_tokens)
        parts = String.split(input, match, parts: 2)
        new_input = "#{Enum.at(parts, 0)}#{processed}#{Enum.at(parts, 1)}"
        compute_parentheses_inside_out(new_input)
    end
  end

  def evaluate_tokens(tokens) do
    evaluate_tokens(tokens, ["^", "/", "*", "+", "-"])
  end

  defp evaluate_tokens(tokens, [op | other_ops]) do
    case find_and_apply(tokens, op) do
      new_tokens -> evaluate_tokens(new_tokens, other_ops)
    end
  end

  defp evaluate_tokens(tokens, []) do
    # When there are no more operators to process, we should have a single number left
    List.first(tokens)
  end

  defp find_and_apply(tokens, op) do
    case Enum.find_index(tokens, &(&1 == op)) do
      nil ->
        tokens
      index ->
        left = Enum.at(tokens, index - 1)
        right = Enum.at(tokens, index + 1)
        result = apply_operation(left, right, op)
        new_tokens = Enum.slice(tokens, 0, index - 1) ++ [result] ++ Enum.slice(tokens, index + 2, length(tokens) - index)
        find_and_apply(new_tokens, op)
    end
  end

  defp apply_operation(left, right, op) do
    {left_num, _} = Float.parse(left)
    {right_num, _} = Float.parse(right)

    result =
      case op do
        "^" -> :math.pow(left_num, right_num)
        "*" -> left_num * right_num
        "/" -> left_num / right_num
        "+" -> left_num + right_num
        "-" -> left_num - right_num
        _ -> raise "Unknown operation #{op}"
      end

    "#{result}"
  end

end
