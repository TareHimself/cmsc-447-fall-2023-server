# 447 Project Server

## Info

You need NodeJS and visual studio build tools to run this server
This server support upload, download and other options supported by the front end

## How To Run

For port 11000

```bash
# If this fails you may be missing build tools https://learn.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170
npm install 
npm run build
npm run start
```

For port 9500
```bash
# If this fails you may be missing build tools https://learn.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170
npm install
npm run build
npm run debug
```

## Docker 
This server supports docker, to build and run type the following into the terminal 
```bash
npm run docker:build
npm run docker:run
```