# Usage: "mix generate_variable_docs lib/dragncards_game/evaluate/variables"

defmodule Mix.Tasks.GenerateVariableDocs do
  use Mix.Task

  @shortdoc "Generates Markdown documentation for all modules in a specified directory and saves it in Variables.md."

  def run(args) do
    [directory] = args
    docs =
      File.ls!(directory)
      |> Enum.sort()
      |> Enum.map(&file_to_module_name/1)
      |> Enum.filter(&Code.ensure_loaded?/1)
      |> Enum.map(&generate_markdown/1)
      |> Enum.join("\n\n")


    File.write!("doc/Variables.md", docs)
    IO.puts("Documentation written to doc/Variables.md")
  end

  defp file_to_module_name(file) do
    module_name = file
    |> String.trim_trailing(".ex")
    |> String.split("/")
    #|> Enum.map(&String.capitalize/1)
    |> Enum.join(".")

    # Prepend the string "Elixir.DragnCardsGame.Evaluate.Functions." to the module name
    String.to_atom("Elixir.DragnCardsGame.Evaluate.Variables.#{module_name}")

  end

  defp generate_markdown(module) do
    case Code.fetch_docs(module) do
      {:docs_v1, _, _, _, module_docs, _, _} ->
        module_name = Atom.to_string(module) |> String.split(".") |> Enum.at(-1)
        "### `$#{module_name}`\n\n" <> (module_docs["en"] || "No module documentation available.") <> "\n----"
      _ ->
        ""
    end
  end
end
