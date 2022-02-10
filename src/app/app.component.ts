import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';

import ZoomVideo from '@zoom/videosdk';

declare const window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  window = window;

  isLoading: boolean = false;
  activeSpeaker: any = {};

  isScreensharing: boolean = false;
  isCamera: boolean = false;
  isAudio: boolean = false;
  isMute: boolean = true;
  isSession: boolean = false;

  selfViewCanvas: any;
  speakerViewCanvas: any;
  selfViewVideo: any;
  galleryViewCanvas: any;
  screenshareCanvas: any;
  chromeReceiveScreenshareCanvas: any;

  signatureEndpoint: string = 'https://videosdk-sample-signature.herokuapp.com';
  sessionName: string = 'testSDK12';
  sessionPasscode: string = '';
  userName: string = 'Tommy' + Math.floor(Math.random() * 100);

  zoomVideoSDK = ZoomVideo.createClient();
  zoomMediaStream: any;

  user: any;

  particpantVideoOn: boolean = false
  participantScreenshareOn: boolean = false

  constructor(public httpClient: HttpClient, @Inject(DOCUMENT) document: any, private changeDetectorRef: ChangeDetectorRef) {

    this.zoomVideoSDK.on('peer-video-state-change', (payload) => {

      console.log(this.zoomVideoSDK.getAllUser())

      // only render video if they are active speaker

      console.log(payload)
      console.log(this.activeSpeaker)

      if(payload.userId === this.activeSpeaker.userId) {
        if(payload.action === 'Start') {
          console.log('active speaker turned video on')
          this.particpantVideoOn = true;
          this.speakerViewCanvas = document.querySelector('#speaker-view-canvas');
          this.zoomMediaStream.renderVideo(this.speakerViewCanvas, payload.userId, 1920, 1080, 0, 0, 3)

        } else if (payload.action === 'Stop') {
          console.log('active speaker turned video off')
          this.particpantVideoOn = false;
          this.speakerViewCanvas = document.querySelector('#speaker-view-canvas');
          this.zoomMediaStream.stopRenderVideo(this.speakerViewCanvas, payload.userId);
        } else {
          console.log('something idk', payload)
        }
      } else {
        // not active speaker don't do anything
        console.log('not active speaker dont do anything')
      }
      this.changeDetectorRef.detectChanges();
    })

    this.zoomVideoSDK.on('active-speaker', (payload) => {

      console.log(payload)

      this.speakerViewCanvas = document.querySelector('#speaker-view-canvas');

      if(payload[0].userId === this.user.userId) {
        // I am active speaker, dont change my view
        console.log('I am active speaker')
      } else {
        // Someone else is active speaker

        // check if active speaker has video on
        if(this.zoomVideoSDK.getAllUser().filter((user) => {
          return user.userId === payload[0].userId
        })[0].bVideoOn) {

          console.log('active speaker has video on')

          this.activeSpeaker = payload[0]
          this.particpantVideoOn = true;
          this.zoomMediaStream.renderVideo(this.speakerViewCanvas, payload[0].userId, 1920, 1080, 0, 0, 3);
        } else {
          // active speaker doesn't have video on
          console.log('active speaker doesnt have video on')

          this.activeSpeaker = payload[0]
          this.particpantVideoOn = false;
        }
      }
      this.changeDetectorRef.detectChanges();
    })

    this.zoomVideoSDK.on('user-added', (payload) => {
      console.log(payload)

      if(this.user) {
        // Someone else connected
        if(this.activeSpeaker.displayName) {
          console.log('do nothing, cause there is already an active speaker')
          // do nothing, cause there is already an active speaker
        } else {
          console.log('set this person as active speaker since there isnt already an active speaker')
          this.activeSpeaker = payload[0]
        }
      } else {
        // I connected
        console.log('I connected')

        // check if there are other particpants, if so, render the second user
        if(this.zoomVideoSDK.getAllUser().length > 1) {
          console.log('not first one in session, render someone')
          console.log(this.zoomVideoSDK.getAllUser())
          this.activeSpeaker = this.zoomVideoSDK.getAllUser()[1]
        } else {
          console.log('first one in session')
        }
      }
      this.changeDetectorRef.detectChanges();
    })

    this.zoomVideoSDK.on('user-removed', (payload) => {
      if(payload.length) {
        console.log(payload)
        console.log(this.activeSpeaker)

        // detect if user that was removed was active speaker.
        if(payload[0].userId === this.activeSpeaker.userId) {
          console.log('active speaker left')
          // if they are active speaker, set 2nd particpant as active speaker if there is more than one particpant
          if(this.zoomVideoSDK.getAllUser().length > 1) {
            console.log('set new active speaker since active speaker left')
            this.activeSpeaker = this.zoomVideoSDK.getAllUser()[1]
          } else {
            this.activeSpeaker = {}
            console.log('last one in session')
          }
        } else {
          // if they aren't active speaker don't do anything.
          console.log('not active speaker left')
        }
        this.changeDetectorRef.detectChanges();
      }
    })

    this.zoomVideoSDK.on('active-share-change', (payload) => {
      console.log(payload)

      if(payload.state === 'Active'){
        if(!!window.chrome) {
          this.chromeReceiveScreenshareCanvas = document.querySelector('#chrome-receive-screenshare-canvas');
          console.log(this.chromeReceiveScreenshareCanvas)
          this.zoomMediaStream.startShareView(this.chromeReceiveScreenshareCanvas, payload.userId);
        } else {
          this.screenshareCanvas = document.querySelector('#screenshare-canvas');
          console.log(this.screenshareCanvas)
          this.zoomMediaStream.startShareView(this.screenshareCanvas, payload.userId).then((data: any) => {
            console.log(data)
          }).catch((error: any) => {
            console.log(error)
          })
        }
        this.participantScreenshareOn = true
      } else if(payload.state==='Inactive'){
        this.participantScreenshareOn = false
        console.log(this.zoomMediaStream)
        console.log(this.zoomMediaStream.stopShareView)
        this.zoomMediaStream.stopShareView()
      } else {
        console.log('something idk', payload)
      }
      this.changeDetectorRef.detectChanges();
    })
  }

  ngOnInit() {

  }

  joinSession() {
    this.isSession = true;
    this.zoomVideoSDK.init('US-en', 'CDN');

    this.httpClient.post(this.signatureEndpoint, {
      sessionName: this.sessionName,
	    sessionPasscode: this.sessionPasscode
    }).toPromise().then((data: any) => {
      if(data.signature) {
        console.log(data.signature)

        this.zoomVideoSDK.join(this.sessionName, data.signature, this.userName, this.sessionPasscode).then((data: any) => {
          this.user = data;
          this.activeSpeaker = {}
          console.log(this.user)
          // this.zoomMediaStream = this.zoomVideoSDK.getMediaStream();

        }).catch((error: any) => {
          console.log(error)
        })
        this.zoomMediaStream = this.zoomVideoSDK.getMediaStream();
      } else {
        console.log(data)
      }
    }).catch((error: any) => {
      console.log(error)
    })
  }

  connectAudio() {
    this.isAudio = true;
    this.zoomMediaStream.startAudio();
  }

  unmute() {
    this.isMute = false;
    this.zoomMediaStream.unmuteAudio();
  }

  mute() {
    this.isMute = true;
    this.zoomMediaStream.muteAudio();
  }

  startCamera() {
    this.isCamera = true;
    if(!!window.chrome) {
      this.selfViewVideo = document.querySelector('#self-view-video');
      this.zoomMediaStream.startVideo({ videoElement: this.selfViewVideo, mirrored: true });
    } else {
      this.selfViewCanvas = document.querySelector('#self-view-canvas');
      this.zoomMediaStream.startVideo().then(() => {
        this.zoomMediaStream.renderVideo(this.selfViewCanvas, this.user.userId, 1920, 1080, 0, 0, 3);
      }).catch((error: any) => {
        console.log(error)
      })
    }
  }

  stopCamera() {
    this.isCamera = false;

    if(!!window.chrome) {
      this.zoomMediaStream.stopVideo();
    } else {
      // this.zoomMediaStream.stopRenderVideo(this.selfViewCanvas, this.user.userId);
      this.zoomMediaStream.stopVideo();
    }
  }

  startScreenshare() {
    this.isScreensharing = true;
    this.screenshareCanvas = document.querySelector('#screenshare-canvas');
    console.log(this.screenshareCanvas)
    // pass in canvas
    this.zoomMediaStream.startShareScreen(this.screenshareCanvas);
  }

  stopScreenshare() {
    this.isScreensharing = false;
    this.zoomMediaStream.stopShareScreen();
  }

  leaveSession() {
    this.isSession = false;
    this.zoomVideoSDK.leave();
  }

  joinBreakout() {
    console.log('join breakout')
    // leave current session
    // generate new signature
    // join new session

    this.isCamera = false;
    this.isSession = false;

    this.zoomVideoSDK.leave().then((data: any) => {

      this.isSession = true;
      console.log(data)
      console.log(this.user)
      console.log(this.activeSpeaker)

      this.httpClient.post(this.signatureEndpoint, {
        sessionName: 'Breakout123',
  	    sessionPasscode: 'breakpas'
      }).toPromise().then((data: any) => {
        if(data.signature) {
          console.log(data.signature)

          this.zoomVideoSDK.join('Breakout123', data.signature, this.userName, 'breakpas').then((data: any) => {
            this.user = data;
            this.activeSpeaker = {}
            console.log(this.user)
            // this.zoomMediaStream = this.zoomVideoSDK.getMediaStream();
            console.log(this.activeSpeaker)

          }).catch((error: any) => {
            console.log(error)
          })
          this.zoomMediaStream = this.zoomVideoSDK.getMediaStream();
        } else {
          console.log(data)
        }
      }).catch((error: any) => {
        console.log(error)
      })

    }).catch((error: any) => {
      console.log(error)
    })
  }

  rejoinMainSession() {
    console.log('rejoin mainsession')
    // leave current session
    // generate new signature
    // join new session

    this.isCamera = false;
    this.isSession = false;

    this.zoomVideoSDK.leave().then((data: any) => {

      this.isSession = true;
      console.log(data)

      this.joinSession()

    }).catch((error: any) => {
      console.log(error)
    })
  }
}
