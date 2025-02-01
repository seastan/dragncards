
defmodule DragnCardsUtil.TsvProcess do
  def process_rows(_game_def, rows) do

    header0 = List.first(rows)
    # trim off the \r and \n
    header0 = Enum.map(header0, fn x -> String.trim(x, "\r") |> String.trim("\n") end)

    Enum.each(["databaseId", "name", "imageUrl", "cardBack", "type"], fn x ->
      unless Enum.member?(header0, x) do
        raise "Missing #{x} column"
      end
    end)

    # cut off the header row
    rows = Enum.slice(rows, 1..-1)

    {card_db, _, _} = Enum.reduce(rows, {%{}, "", "A"}, fn(row, {db, multi_sided_database_id, multi_sided_side}) ->
      # Trim off the \r and \n
      row = Enum.map(row, fn x -> String.trim(x, "\r") |> String.trim("\n") end)
      face = make_face(header0, row)
      database_id = face["databaseId"]

      # Is this a multi-side of a previous card?
      if database_id == multi_sided_database_id do
        # If database_id is not in db, raise an error
        unless database_id in Map.keys(db) do
          raise "Missing #{database_id} in database"
        end
        db = put_in(db, [database_id, multi_sided_side], face)
        case multi_sided_side do
          "B" ->
            {db, multi_sided_database_id, "C"}
          "C" ->
            {db, multi_sided_database_id, "D"}
          "D" ->
            {db, multi_sided_database_id, "E"}
          "E" ->
            {db, multi_sided_database_id, "F"}
          "F" ->
            {db, multi_sided_database_id, "G"}
          "G" ->
            {db, multi_sided_database_id, "H"}
          "H" ->
            {db, multi_sided_database_id, "I"}
          _ ->
            raise "Too many sides for #{database_id}"
        end
      else
      # It's a new card
        face_a = face
        face_b = make_null_face(header0)
        face_b = Map.put(face_b, "name", face_a["cardBack"])
        db = Map.put(db, database_id, %{"A" => face_a, "B" => face_b})
        if face_a["cardBack"] == "multi_sided" do
          {db, database_id, "B"}
        else
          {db, "", "A"}
        end
      end
    end)

    card_db

  end

  defp make_face(header0, row) do
    Enum.reduce(0..(length(header0) - 1), %{}, fn j, face_acc ->
      col_name = Enum.at(header0, j)
      Map.put(face_acc, col_name, Enum.at(row, j))
    end)
  end

  defp make_null_face(header0) do
    Enum.reduce(0..(length(header0) - 1), %{}, fn j, face_acc ->
      col_name = Enum.at(header0, j)
      Map.put(face_acc, col_name, nil)
    end)
  end

end
