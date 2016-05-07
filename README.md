Dubloons
========

A toy slackbot I wrote for [FareHarbor](https://fareharbor.com/).

# Configuration:

```
# dubloons.conf
announcements: #channel
icon: ":tada:"

bankers:
  - @user
  - @user

joint-accounts:
  team1:
    - @user
    - @user
  team2:
    - @user
  team3:
    - @user
    - @user
    - @user
```

# Usage:

* `/dubloons give [N] to @user`

Give `N` dubloons to `@user`; the current user must
be a Dubloons banker.

* `/dubloons balances [N]`

Show balances of top `N` users and teams.

* `/dubloons balance [@user]`

Show your balance; if you are a banker you can optionally
pass a separate `@user` and show their balance.

`/dubloons spend [N] [@user]`

Spend `N` dubloons; if you are a banker you can optionally
pass a separate `@user` and spend *their* dubloons instead.
