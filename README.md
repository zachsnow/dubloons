Dubloons
========

A toy slackbot I wrote for [FareHarbor](https://fareharbor.com/).

# Installation:

```
$ npm install
```

# Configuration:

```
# dubloons.conf
token: <SLACK TOKEN>
announcements: #general
icon: ":tada:"

bankers: @group
groups:
  - @product
  - @sales
```

# Running:

```
$ node bin/index.js [ CONFIG ] [ --debug ]
```

# Bot Usage:

* `/dubloons give $N to @user`

Give `$N` new dubloons to `@user`; only available to bankers.

* `/dubloons pay $N to @user`

Send `$N` dubloons of your dubloons to `@user`.

* `/dubloons balances`

Show balances of top users and groups.

* `/dubloons balance [of @user]`

Show your balance; you can optionally pass a separate `@user` to show their balance.

# Announcements:

When a user receives (via `/dubloons give` or `/dubloons pay`) it is announced in the `announcements`
channel (configured in `dubloons.conf`).

Hourly balance summaries for the top users and groups (equivalent of `/dubloons balances`) are posted
in the `announcements` channel as well.
