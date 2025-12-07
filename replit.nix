{ pkgs }: {
	deps = [
   pkgs.librsvg
   pkgs.libjpeg
   pkgs.giflib
   pkgs.pango
   pkgs.cairo
   pkgs.libuuid
		pkgs.ffmpeg.bin
  pkgs.nodejs-16_x
        pkgs.nodePackages.typescript-language-server
        pkgs.yarn
        pkgs.replitPackages.jest
	];
}