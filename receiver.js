const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    request => {
        console.log('LOAD request', request);

        // Customize media information
        const media = request.media;
        if (media && media.metadata) {
            media.metadata.title = "גלי צה"ל";
            media.metadata.artist = "רדיו אינטרנט";
        }

        return request;
    });

// Add event listeners for playerManager
playerManager.addEventListener(cast.framework.PlayerManagerEventType.STATUS, (event) => {
  console.log('Player status event: ' + JSON.stringify(event.detailedReasonCode));
});

context.start();
console.log("אפליקציית רדיו - מקלט מוכנה");
