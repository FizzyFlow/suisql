# blobsee

Walrus Sites File Manager. Breaking the Ice contest entry.

[blobsee on the Walrus](https://blobsee.walrus.site/)

- Upload/Download files and media
- Browse yours and others walrus sites files
- AES Encryption to protect your files and media
- Breaking the ice
- Everything is the blob!
- [Demo video](https://www.youtube.com/watch?v=l9jxesE7JzI) 

Still a bit buggy. Please feel free to reload the page if it lost some events or get lost in memory heap. 
Promise to fix everything if you vote for me, guys.

### Encryption/Decription

Performing fully on the client side, does `AES( data, PBKDF2( randomIV + wallet.signMessage(stringWithFileSize) ))` as encryptor/decryptor. May be easily adjusted into password-based or any other key derivation function (including smart contracts integration).

### Caching

Stores blobs in the browser cache in the same way Walrus Portal does. Keeping aggregator for video urls to enable `content-range` headers and video streaming.
@todo: implement service worker with streaming support?

### UI

Vue

### points of interest

- [walrus object classes](https://github.com/suidouble/blobsee/tree/main/shared/classes/walrus)
- [AES](https://github.com/suidouble/blobsee/blob/main/shared/classes/AES.js)
- [walrus UI Components](https://github.com/suidouble/blobsee/tree/main/shared/components/Walrus)

### dev

```bash
npm install
npm run dev
```

### license

GNU AFFERO GENERAL PUBLIC LICENSE