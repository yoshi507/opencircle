export default function FriendsPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">Friends & DMs</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground text-sm">
            Friend requests and direct messages will live here in Milestone 1.
          </p>
        </div>
      </div>
    </div>
  );
}
