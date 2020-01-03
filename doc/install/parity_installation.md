# Parity Installation

## Build Dependencies

Parity Ethereum requires **latest stable Rust version** to build.

We recommend installing Rust through [rustup](https://www.rustup.rs/). If you don't already have `rustup`, you can install it like this:

- Linux:
  ```bash
  $ curl https://sh.rustup.rs -sSf | sh
  ```

  Parity Ethereum also requires `gcc`, `g++`, `pkg-config`, `file`, `make`, and `cmake` packages to be installed.

- OSX:
  ```bash
  $ curl https://sh.rustup.rs -sSf | sh
  ```

  `clang` is required. It comes with Xcode command line tools or can be installed with homebrew.

- Windows:
  Make sure you have Visual Studio 2015 with C++ support installed. Next, download and run the `rustup` installer from
  https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe, start "VS2015 x64 Native Tools Command Prompt", and use the following command to install and set up the `msvc` toolchain:
  ```bash
  $ rustup default stable-x86_64-pc-windows-msvc
  ```

Once you have `rustup` installed, then you need to install:
* [Perl](https://www.perl.org)
* [Yasm](https://yasm.tortall.net)

Make sure that these binaries are in your `PATH`. After that, you should be able to build Parity Ethereum from source.

## Build Parity from Source Code

Download and extract the source code from here: https://github.com/paritytech/parity-ethereum/releases/tag/v1.11.11

**Note:** to work with the Sentinel Chain configuration files, the Parity version must be stricly `v1.11.11`.

```bash
$ cd parity-ethereum

# build in release mode
$ cargo build --release --features final
```

This produces an executable in the `./target/release` subdirectory.

Note: if cargo fails to parse manifest try:

```bash
$ ~/.cargo/bin/cargo build --release
```

Note, when compiling a crate and you receive errors, it's in most cases your outdated version of Rust, or some of your crates have to be recompiled. Cleaning the repository will most likely solve the issue if you are on the latest stable version of Rust, try:

```bash
$ cargo clean
```

## Starting Parity Ethereum

### Manually

To start Parity Ethereum manually, just run

```bash
$ ./target/release/parity
```

so Parity Ethereum begins syncing the Ethereum blockchain.

### Using systemd service file

To start Parity Ethereum as a regular user using `systemd` init:

1. Copy `./scripts/parity.service` to your
`systemd` user directory (usually `~/.config/systemd/user`).
2. Copy release to bin folder, write `sudo install ./target/release/parity /usr/bin/parity`
3. Then you can execute Parity binary like this:
```
$ parity
```
