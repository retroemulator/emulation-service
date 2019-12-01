# Emulation Service

> Work in progress.

This service is for creating Docker containers that load instances of various
open-source emulators and load the given ROMs. It uses CloudStream, a Docker
framework for application streaming to provide the video stream of the
emulator. A `socket-io` server runs to provide endpoint for sending commands.

List of supported consoles:
<table>
    <tr>
        <th>Console</th>
        <th>Emulator (Linux)</th>
        <th># Players Supported</th>
    </tr>
    <tr>
        <td>Game Boy Advance</td>
        <td><a href="https://github.com/visualboyadvance-m">VisualBoyAdvance</a></td>
        <td>1</td>
    </tr>
    <tr>
        <td>NES</td>
        <td><a href="http://www.zsnes.com">ZSNES</a></td>
        <td>2</td>
    </tr>
    <tr>
        <td>SNES</td>
        <td><a href="https://github.com/byuu/bsnes">bsnes</a></td>
        <td>2</td>
    </tr>
    <tr>
        <td>Nintendo 64</td>
        <td><a href="https://github.com/mupen64plus">Mupen64Plus</a></td>
        <td>4</td>
    </tr>
</table>

## Getting Started

> TODO: Currently setup for Game Boy Advance (VisualBoyAdvance).

Building the Docker image:
```
docker build -t gba -f Dockerfile .
```

Running the Docker container:
```
docker run -it -p 6080:6080 -p 5000:5000 -p 5002:5002 gba
```

Running the Docker container with custom width and height:
```
docker run -it -p 6080:6080 -p 5000:5000 -p 5002:5002 -e SIZEW=600 -e SIZEH=400 gba
```
