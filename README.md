# Emby.Theater.Electron

#### Fedora 28 Installation Instructions

Install the following packages:

    dnf install npm mpv git nodejs


Fedora will install the `npm` package in a location that will not allow you to install Node.js packages.  To get around this, create a new global location for Node.js packages in your home directory:

    mkdir ~/.npm-global
    npm config set prefix '~/.npm-global'


Open your ~/.bash_profile file from your home directory, and modify your PATH environment variable

    export PATH=$PATH:$HOME/.npm-global/bin


Reload your ~/.bash_profile:

    source ~/.bash_profile


Now, using the `npm` package manager, install the following packages:

    npm install -g electron
    npm install node-mpv


Clone the git repository:

    git clone https://github.com/MediaBrowser/emby-theater-electron.git


Run the Emby Theater application:

    cd emby-theater-linux
    electron main.js

