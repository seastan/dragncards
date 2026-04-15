defimpl Jason.Encoder, for: MapSet do
  def encode(set, opts) do
    Jason.Encode.list(MapSet.to_list(set), opts)
  end
end
