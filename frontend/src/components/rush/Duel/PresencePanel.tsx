import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Stack,
} from '@mui/material';

type UserLite = { userId: string; name: string };

export default function PresencePanel({ users }: { users: UserLite[] }) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">В лобби</Typography>
          <Typography variant="body2">{users.length}</Typography>
        </Stack>
        <List dense disablePadding>
          {users.map((u) => (
            <ListItem key={u.userId} disableGutters sx={{ py: 0.5 }}>
              <Avatar sx={{ width: 28, height: 28, mr: 1.5 }}>
                {u.name?.[0]?.toUpperCase() ?? u.userId?.[0]?.toUpperCase()}
              </Avatar>
              <ListItemText
                primary={u.name || u.userId}
                secondary={u.userId !== u.name ? u.userId : undefined}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
