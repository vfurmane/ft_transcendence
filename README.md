# ft_transcendence

A web Pong game with real-time multiplayer.

## Features

None.

## Getting started

### Prerequisities

You need the following programs to run the application:

- Git
- NodeJS
- NPM

### Installation

1. Clone the repository

```sh
git clone https://github.com/vfurmane/ft_transcendence
```

2. Install the dependencies

```sh
cd ft_transcendence
npm install
```

3. Start the server

```sh
npm start # On the host
docker compose up --build # With docker
```

## Development

```sh
npm run dev # On the host
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build # With docker
```

### Configuration

Environment files must be configured first. You can find template files (`.env.template`) to help you configure the project.

```
# apps/api/.env
POSTGRES_HOST=
POSTGRES_USERNAME=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
```

## Authors

- Brice Detune
- Maxence Eudier
- Savo Saicic
- Théodore Naton
- Valentin Furmanek

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/vfurmane/ft_transcendence/blob/main/LICENSE) file for details.
