defmodule DragnCardsUtil.StringMathTest do
  use ExUnit.Case
  alias DragnCardsUtil.{StringMath}

  @tag :only
  test "test" do
    expression = "2+3-4"
    IO.puts("expession: #{expression}")
    expression = StringMath.insert_implicit_multiplication(expression)
    IO.puts("expession: #{expression}")
    result = StringMath.compute_parentheses_inside_out(expression)
    IO.puts("result: #{result}")
    tokens = StringMath.string_to_tokens(result)
    IO.puts("tokens: #{inspect(tokens)}")
    final_result = StringMath.evaluate_tokens(tokens)
    IO.puts("final_result: #{final_result}")
    {float_result, _} = Float.parse(final_result)
    IO.puts("float_result: #{float_result}")
    float_result
  end

  test "is_operator/1 with various characters" do
    assert StringMath.is_operator("+"), message: "should identify '+' as an operator"
    assert StringMath.is_operator("-"), message: "should identify '-' as an operator"
    assert StringMath.is_operator("*"), message: "should identify '*' as an operator"
    assert StringMath.is_operator("/"), message: "should identify '/' as an operator"
    assert StringMath.is_operator("^"), message: "should identify '^' as an operator"
    refute StringMath.is_operator("a"), message: "should not identify 'a' as an operator"
    refute StringMath.is_operator("1"), message: "should not identify '1' as an operator"
    refute StringMath.is_operator(" "), message: "should not identify space as an operator"
  end

  test "StringMath.merge_negative_sign/1 with varied cases" do
    assert StringMath.merge_negative_sign(["2", "-", "3"]) == ["2", "-", "3"], message: "should handle single negative sign"
    assert StringMath.merge_negative_sign(["3", "-", "*"]) == ["3", "-", "*"], message: "should handle non-adjacent negative sign"
    assert StringMath.merge_negative_sign(["-", "3", "*", "4"]) == ["-3", "*", "4"], message: "should merge negative sign with parentheses"
    assert StringMath.merge_negative_sign(["3", "+", "-", "4"]) == ["3", "+", "-4"], message: "should handle negative sign before addition"
  end

  test "StringMath.insert_implicit_multiplication/1 with multiple cases" do
    assert StringMath.insert_implicit_multiplication("3+(4)") == "3+(4)", message: "should insert multiplication before opening parenthesis"
    assert StringMath.insert_implicit_multiplication("5(2+3)") == "5*(2+3)", message: "should not modify multiplication after operator"
    assert StringMath.insert_implicit_multiplication("(a)") == "(a)", message: "should not handle function calls"
  end

  test "StringMath.string_to_tokens/1 with varied expressions" do
    assert StringMath.string_to_tokens("2+3") == ["2", "+", "3"], message: "should split by operators"
    assert StringMath.string_to_tokens("0.5*4+6") == ["0.5", "*", "4", "+", "6"], message: "should handle floating-point numbers and parentheses"
  end

  test "StringMath.evaluate_string/1 with multiple operators" do
    assert StringMath.evaluate_string("2+3-4") == 1, message: "should evaluate multiple operators in order"
    assert StringMath.evaluate_string("3*4/2") == 6, message: "should evaluate multiplication and division correctly"
    assert StringMath.evaluate_string("2^3") == 8, message: "should evaluate exponentiation"
    assert StringMath.evaluate_string("2/4") == 0.5, message: "should evaluate exponentiation"
    assert StringMath.evaluate_string("(2+3)*4") == 20, message: "should evaluate expressions with parentheses"
    assert StringMath.evaluate_string("-5+4") == -1, message: "should handle negative numbers"
  end

  test "StringMath.evaluate_string/1 with edge cases" do
    assert_raise RuntimeError, ~r/Invalid expression/, fn -> StringMath.evaluate_string("0/0") end
    assert_raise RuntimeError, ~r/Invalid expression/, fn -> StringMath.evaluate_string("sin(0.1)") end
    assert_raise RuntimeError, ~r/Invalid expression/, fn -> StringMath.evaluate_string("") end
    assert_raise RuntimeError, ~r/Invalid expression/, fn -> StringMath.evaluate_string("2++3") end
    assert_raise RuntimeError, ~r/Invalid expression/, fn -> StringMath.evaluate_string("(2+)3") end
  end
end
