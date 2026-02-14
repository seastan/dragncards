declare module "elixir-backend" {

  export declare class Room {
    public id: number;
    public name: string;
    public slug: string;
    public created_by: null | number;
    public privacy_type: string;
    public last_update: null | number;
    public quest: string;
    public encounter_name: null | string;
    public num_players: null | number;
  }


  // One side of a card
  export declare class CardFace {
    public name: string;
    public src: sring;
    public width: number;
    public height: number;
  }

  export declare class Card {
    public id: string;
    public rotation: number;
    public exhausted: boolean;
    public tokens: Tokens;
    public owner: number;
    public controller: number;

    public CurrentSide: string;
    public Sides: { [id: string] : CardFace; };
  }

  export declare class CardAndLoc {
    card: Card;
    groupId: String;
    stackIndex: number;
    cardIndex: number;
  }

  export declare class Tokens {
    public resource: number;
    public progress: number;
    public damage: number;
    public time: number;
    public threat: number;
    public willpower: number;
    public attack: number;
    public defense: number;
  }

  export declare class Group {
    id: string;
    name: string;
    type: string;
    controller: string;
    cards: Array<Card>;
    updated: boolean;
    stacks: Array<Stack>;
  }

  export declare class Groups {
    [key:string]: Group
  }

  export declare class Stack {
    controller: string;
    cards: Array<Card>;
  }

  export declare class GameUI {
    createdAt: any;
    game: Game;
    game_name: string;
    options: any;
    playerInfo: { [id: string] : number; [alias: string] : string; };
    playersInRoom: { [id: string] : number; };
  }


  export declare class Game {
    firstPlayer: String; // "player1"
    options: any;
    roundNumber: number;
    phase: String;
    gameStep: String;
    groups: Groups;
    playerData: { [id: string] : Player; };
  }

  export declare class Player {
    threat: number;
    willpower: number;
  }


  // Profile: Private information about your own account.
  export declare class Profile {
    public id: number;
    public email: string;
    public alias: string;
    public inserted_at: string; // Actually contains a timestamp
    public email_confirmed_at: null | string; // Actually contains a timestamp
    public supporter_level: null | integer;
    public background_url: null | string;
    public player_back_url: null | string;
    public encounter_back_url: null | string;
    public admin: null | integer;
    public language: null | string;
    public hidden_tooltips: null | Array<string>;
  }

  // User: Public information about other users.
  export declare class User {
    public id: number;
    public alias: string;
    public supporter_level: null | number;
  }

  export declare class ChatMessage {
    public text: string;
    public sent_by: number | null;
    public when: string; // Actually a timestamp
    public shortcode: string;
    public game_update: boolean;
  }
}
