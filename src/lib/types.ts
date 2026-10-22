export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  status?: string;
  created_at?: string;
  is_bot?: boolean;
};

export type Server = {
  id: string;
  name: string;
  owner_id: string;
  description: string | null;
  icon_url: string | null;
  visibility: "public" | "private";
  created_at: string;
};

export type Channel = {
  id: string;
  server_id: string;
  category_id: string | null;
  name: string;
  type: "text" | "voice" | "announcement" | "forum";
  position: number;
  topic: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  channel_id: string;
  author_id: string;
  content: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author?: Profile | null;
};
