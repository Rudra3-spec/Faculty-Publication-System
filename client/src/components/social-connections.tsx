import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, UserMinus, Users } from "lucide-react";
import { Link } from "wouter";

interface SocialConnectionsProps {
  userId: number;
}

export function SocialConnections({ userId }: SocialConnectionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: followers } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "followers"],
    enabled: !!userId,
  });

  const { data: following } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "following"],
    enabled: !!userId,
  });

  const { data: isFollowing } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/users", userId, "is-following"],
    enabled: !!userId && !!user && userId !== user.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
      toast({ title: "Successfully followed user" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to follow user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/unfollow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
      toast({ title: "Successfully unfollowed user" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unfollow user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/friend-requests/send/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Friend request sent" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const isOwnProfile = user.id === userId;

  const UserList = ({ users, title }: { users: User[]; title: string }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          {title} ({users?.length || 0})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {users?.map((user) => (
            <div key={user.id} className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.profilePicture} />
                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link href={`/profile/${user.id}`} className="font-medium hover:underline">
                  {user.name}
                </Link>
                <p className="text-sm text-muted-foreground">{user.designation}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <UserList users={followers || []} title="Followers" />
            <UserList users={following || []} title="Following" />
          </div>
          
          {!isOwnProfile && (
            <div className="flex gap-4">
              <Button
                variant={isFollowing?.isFollowing ? "outline" : "default"}
                className="w-full gap-2"
                onClick={() => {
                  if (isFollowing?.isFollowing) {
                    unfollowMutation.mutate();
                  } else {
                    followMutation.mutate();
                  }
                }}
                disabled={followMutation.isPending || unfollowMutation.isPending}
              >
                {isFollowing?.isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => sendFriendRequestMutation.mutate()}
                disabled={sendFriendRequestMutation.isPending}
              >
                <UserPlus className="h-4 w-4" />
                Add Friend
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
