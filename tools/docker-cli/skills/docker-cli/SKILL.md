---
name: docker-cli
description: |
  Use the Docker CLI to manage containers, images, volumes, and networks.
  Use when: building, running, debugging, or managing containerized applications.
---

# Docker CLI

## Instructions
Use the Docker CLI to manage containers, images, and Docker resources.

USAGE
  docker [OPTIONS] COMMAND [ARG...]

COMMON COMMANDS
  run:         Create and run a new container from an image
  exec:        Execute a command in a running container
  ps:          List containers
  build:       Build an image from a Dockerfile
  pull:        Download an image from a registry
  push:        Upload an image to a registry
  images:      List images
  logs:        Fetch the logs of a container
  stop:        Stop one or more running containers
  rm:          Remove one or more containers
  rmi:         Remove one or more images

COMPOSE COMMANDS
  compose up:      Create and start containers
  compose down:    Stop and remove containers, networks
  compose ps:      List containers
  compose logs:    View output from containers
  compose build:   Build or rebuild services

VOLUME COMMANDS
  volume create:   Create a volume
  volume ls:       List volumes
  volume rm:       Remove one or more volumes

NETWORK COMMANDS
  network create:  Create a network
  network ls:      List networks
  network rm:      Remove one or more networks

FLAGS
  --help      Show help for command
  --version   Show Docker version

EXAMPLES
  $ docker run -d -p 80:80 nginx
  $ docker compose up -d
  $ docker build -t myapp .
  $ docker exec -it container_name bash

LEARN MORE
  Use `docker COMMAND --help` for more information about a command.
  Read the manual at https://docs.docker.com/reference/cli/docker/
