FROM unidata/cloudstream

USER root

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get -y upgrade

# Begin custom commands

ENV APPLICATION_NAME EmulationService

ENV APPLICATION_VERSION DEMO1.0.0

RUN apt-get install -y xdotool visualboyadvance curl sudo

RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash -

RUN apt-get install -y nodejs

USER ${CUSER}

COPY . ${HOME}/

EXPOSE 5000

EXPOSE 5002

RUN echo "${APPLICATION_NAME} Version: \"${APPLICATION_VERSION}\"\t$(date)" >> $VERSION_FILE
