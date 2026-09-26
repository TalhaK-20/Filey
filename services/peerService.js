/**
 * Forward-looking interface for a future peer-to-peer architecture.
 *
 * V1 is fully centralized: FILEY itself is the only "peer" — it holds the file
 * index and the storage layer (see storageService.js). Nothing here is wired
 * into the app yet. The shape exists so that a future version can introduce
 * real peers (browser clients holding pieces of files, exchanged via WebRTC)
 * without changing the routes/controllers that call into this service.
 *
 * Planned V2 flow:
 *   FILEY (index) -> peerService.searchPeers(query) -> [{ peerId, files }]
 *                 -> peerService.requestFile(peerId, fileId) -> stream/transfer
 *                 -> peerService.getPeerStatus(peerId) -> online/offline, speed
 */

async function searchPeers(query) {
  throw new Error('peerService.searchPeers is not implemented in V1 (centralized index only).');
}

async function requestFile(peerId, fileId) {
  throw new Error('peerService.requestFile is not implemented in V1 (centralized index only).');
}

async function getPeerStatus(peerId) {
  throw new Error('peerService.getPeerStatus is not implemented in V1 (centralized index only).');
}

module.exports = { searchPeers, requestFile, getPeerStatus };
