defmodule DragnCardsGame.RuleMapTest do
  use ExUnit.Case
  alias DragnCardsGame.RuleMap

  describe "add_to_rule_map/3" do
    test "adds a value to a nested map at a specific path" do
      initial_map = %{}
      path = ["level1", "level2"]
      val = "rule_1"

      expected_map = %{
        "level1" => %{
          "level2" => %{
            "_rule_ids" => ["rule_1"]
          }
        }
      }

      assert RuleMap.add_to_rule_map(initial_map, path, val) == expected_map
    end

    test "appends a value to existing _rule_ids list" do
      initial_map = %{
        "level1" => %{
          "level2" => %{
            "_rule_ids" => ["rule_1"]
          }
        }
      }
      path = ["level1", "level2"]
      val = "rule_2"

      expected_map = %{
        "level1" => %{
          "level2" => %{
            "_rule_ids" => ["rule_2", "rule_1"]
          }
        }
      }

      assert RuleMap.add_to_rule_map(initial_map, path, val) == expected_map
    end

    test "handles adding to a non-existent path" do
      initial_map = %{
        "level1" => %{
          "level2" => %{}
        }
      }
      path = ["level1", "level2", "level3"]
      val = "rule_3"

      expected_map = %{
        "level1" => %{
          "level2" => %{
            "level3" => %{
              "_rule_ids" => ["rule_3"]
            }
          }
        }
      }

      assert RuleMap.add_to_rule_map(initial_map, path, val) == expected_map
    end
  end

  describe "get_ids_by_path/2" do
    test "retrieves ids by exact path" do
      map = %{
        "level1" => %{
          "level2" => %{
            "_rule_ids" => ["rule_1"]
          }
        }
      }
      path = ["level1", "level2"]

      assert RuleMap.get_ids_by_path(map, path) == ["rule_1"]
    end

    test "returns empty list if no _rule_ids found" do
      map = %{
        "level1" => %{
          "level2" => %{}
        }
      }
      path = ["level1", "level2"]

      assert RuleMap.get_ids_by_path(map, path) == []
    end

    test "retrieves ids from wildcard path" do
      map = %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_2"]
          },
          "level2" => %{
            "_rule_ids" => ["rule_1"]
          }
        }
      }
      path = ["level1", "non_existent"]

      assert RuleMap.get_ids_by_path(map, path) == ["rule_2"]
    end

    test "retrieves ids from both exact and wildcard paths" do
      map = %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_2"]
          },
          "level2" => %{
            "_rule_ids" => ["rule_1"]
          }
        }
      }
      path = ["level1", "level2"]

      assert RuleMap.get_ids_by_path(map, path) == ["rule_1", "rule_2"]
    end

    test "retrieves ids from both exact and wildcard paths (deep)" do
      map = %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_1*"],
            "level3" => %{
              "_rule_ids" => ["rule_1*3a"]
            }
          },
          "level2" => %{
            "_rule_ids" => ["rule_12"],
            "level3" => %{
              "_rule_ids" => ["rule_123b"]
            }
          }
        },
        "*" => %{
          "*" => %{
            "*" => %{
              "_rule_ids" => ["rule_***"]
            }
          }
        }
      }
      path = ["level1", "level2", "level3"]

      assert RuleMap.get_ids_by_path(map, path) == ["rule_123b", "rule_1*3a", "rule_***"]
    end

    test "retrieves ids from multiple paths" do
      map = %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_1*"],
            "level3" => %{
              "_rule_ids" => ["rule_1*3a"]
            }
          },
          "level2" => %{
            "_rule_ids" => ["rule_12"],
            "level3" => %{
              "_rule_ids" => ["rule_123b"]
            }
          }
        },
        "*" => %{
          "*" => %{
            "*" => %{
              "_rule_ids" => ["rule_***"]
            }
          }
        }
      }
      path1 = ["level1", "level2", "level3"]
      path2 = ["level1", "level2"]
      paths = [path1, path2]

      assert RuleMap.get_ids_by_paths(paths, map) == ["rule_123b", "rule_1*3a", "rule_***", "rule_12", "rule_1*"]

      paths = [path1, path1]
      assert RuleMap.get_ids_by_paths(paths, map) == ["rule_123b", "rule_1*3a", "rule_***"]

    end

    test "removes an id" do
      map = %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_1*"],
            "level3" => %{
              "_rule_ids" => ["rule_1*3a"]
            }
          },
          "level2" => %{
            "_rule_ids" => ["rule_12"],
            "level3" => %{
              "_rule_ids" => ["rule_123b"]
            }
          }
        },
        "*" => %{
          "*" => %{
            "*" => %{
              "_rule_ids" => ["rule_12"]
            }
          }
        }
      }

      assert RuleMap.remove_rule_id_from_rule_map(map, "rule_12") == %{
        "level1" => %{
          "*" => %{
            "_rule_ids" => ["rule_1*"],
            "level3" => %{
              "_rule_ids" => ["rule_1*3a"]
            }
          },
          "level2" => %{
            "_rule_ids" => [],
            "level3" => %{
              "_rule_ids" => ["rule_123b"]
            }
          }
        },
        "*" => %{
          "*" => %{
            "*" => %{
              "_rule_ids" => []
            }
          }
        }
      }

    end
  end
end
