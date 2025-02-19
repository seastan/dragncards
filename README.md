# DragnCards
Multiplayer online card game written in Elixir, Phoenix, React, and Typescript.


## Local Development

**Requirements**
Docker
Docker Compose

*This was tested on Ubuntu 22.04 Server and 24.04 Server.*

To quickly iterate a development environment included is a `docker compose` file.

```
docker compose up -d backend
#first time this will create a new user in the DB. The user's alias is "dev_user" and the password is "password"
docker compose exec backend mix run /app/priv/create_user.exs

docker compose run --rm --service-ports frontend
```

Browse to your `localhost:3000` and proceed with [plugin installation](https://github.com/seastan/dragncards/wiki/Plugin-Documentation)

### Optional Users

If you need to create additional users with sql you can create the following

| username| password |
|------|-----|
|player1@dragncards.com|password1|
|player2@dragncards.com |password2|
|player3@dragncards.com |password3|
|player4@dragncards.com |password4|

Run the following to create a `users.sql` file and then inject it.
```
cat > users.sql << EOF
      INSERT INTO users (email , alias, inserted_at, updated_at, password_hash, email_confirmed_at, email_confirmation_token ) 
      VALUES ('player1@dragncards.com', 'player1', 'now', 'now', '$pbkdf2-sha512$100000$lBo3zNe49wIoWrAvht6Mbg==$SDfV/L5fNapiox7OgAJNB5rwrUm9RRNPCUBLHKXnNoVHcu574up2Tquxaa6shenktv7sCOtUu6rh4q0CmtOR+w==', 'now', 'c236e80a-2c34-44b9-92ab-312df26365f9' );
      INSERT INTO users (id , email , alias, inserted_at, updated_at, password_hash, email_confirmed_at, email_confirmation_token ) 
      VALUES ('7', 'player2@dragncards.com', 'player2', 'now', 'now', '$pbkdf2-sha512$100000$Hiwfmqbz6R0/R/q3whjVnA==$BvGkKDB/YfRnU4aQcV6INNJ8gv25Quw7SgzG64H7By5EgRdlTXIsOVHcLk7+Lf+bPqLkejAbl4F8Aanl1tASPQ==', 'now', '6a35ba55-fd0d-47e5-aff1-d53edd5af1ec' );
      INSERT INTO users (id , email , alias, inserted_at, updated_at, password_hash, email_confirmed_at, email_confirmation_token ) 
      VALUES ('8', 'player3@dragncards.com', 'player3', 'now', 'now', '$pbkdf2-sha512$100000$Z0jyoOb1KfzCuTGh/xVrZA==$YAlsffctWUbxujs3woZGZO6KGW++LquQAmc9MRalCXqBhaJYiOxJFjkkRjMAtbwLziVxCFD/LiRGlHutGvSpzw==', 'now', '45eacb70-01c4-4194-a3b3-fe927bef0d0b' );
      INSERT INTO users (id , email , alias, inserted_at, updated_at, password_hash, email_confirmed_at, email_confirmation_token ) 
      VALUES ('9', 'player4@dragncards.com', 'player4', 'now', 'now', '$pbkdf2-sha512$100000$1pFAgFabRwWro2FoLewoXw==$z0RCI+KwM68hdCxX+z+pN0mKELAd8aqvuPy+XUxNNx/ebpxrxlrxZ1fvLZ7NJQKyZnoF89NoR3fIggAYOJmEGQ==', 'now', '9c05358a-5b4f-477a-a201-8565a842ec2f' );
EOF
sql -d dragncards_dev -f ./users.sql -U postgres -h 127.0.0.1
```
This will install 4 players to the postgres container exposed locally. If you have different addressing adjust accordingly.
    
### Version of software

There can be challenges with any `snap` installations of `docker` and the bundled version of `compose`. As of time of commit the following versions were working.

```
docker version && docker compose version
Client: Docker Engine - Community
 Version:           27.3.1
 API version:       1.47
 Go version:        go1.22.7
 Git commit:        ce12230
 Built:             Fri Sep 20 11:41:08 2024
 OS/Arch:           linux/arm64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          27.3.1
  API version:      1.47 (minimum version 1.24)
  Go version:       go1.22.7
  Git commit:       41ca978
  Built:            Fri Sep 20 11:41:08 2024
  OS/Arch:          linux/arm64
  Experimental:     false
 containerd:
  Version:          1.7.22
  GitCommit:        7f7fdf5fed64eb6a7caf99b3e12efcf9d60e311c
 runc:
  Version:          1.1.14
  GitCommit:        v1.1.14-0-g2c9f560
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
Docker Compose version v2.29.7
```
