import { Component, AfterViewInit, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import Pusher from 'pusher-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnInit {
  title = 'leaflet-map';
  map: any;
  users_online: any[] = [];
  current_user: string = '';
  locations: any = {};
  center = { lat: 0, lng: 0 };
  markers: any[] = [];

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnInit(): void {
    const pusher = new Pusher(environment.PUSHER_KEY, {
      authEndpoint: `${environment.API_URL}/pusher/auth`,
      cluster: environment.PUSHER_CLUSTER,
    });

    const presenceChannel = pusher.subscribe('presence-channel');

    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      this.users_online = Object.values(members.members);
      this.current_user = members.myID;
      this.getLocation();
      this.notify();
    });

    presenceChannel.bind('location-update', (body: any) => {
      this.locations[body.username] = body.location;
      this.updateMarkers();
    });

    presenceChannel.bind('pusher:member_removed', (member: any) => {
      delete this.locations[member.id];
      this.users_online = this.users_online.filter(
        (user) => user.id !== member.id
      );
      this.updateMarkers();
      this.notify();
    });

    presenceChannel.bind('pusher:member_added', () => {
      this.updateMarkers();
      this.notify();
    });
  }

  notify() {
    // Implement toast notification logic
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoom: 13,
    }).setView([0, 0], 13);
    L.tileLayer(
      'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=NYsNxERW2295n76rryu9',
      {
        attribution:
          '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      }
    ).addTo(this.map);
  }

  private getLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          this.map.setView([location.lat, location.lng], 13);
          this.center = location;
          this.locations[this.current_user] = location;

          this.http
            .post(`${environment.API_URL}/update-location`, {
              username: this.current_user,
              location: location,
            })
            .subscribe((res: any) => {
              if (res.status === 200) {
                console.log('new location updated successfully');
              }
            });

          this.updateMarkers();
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.error('Geolocation is not supported by your browser');
    }
  }

  addMarker(location: { lat: any; lng: any }, label: string) {
    // Define custom marker icon
    L.marker([location.lat, location.lng], { icon: this.marker() })
      .addTo(this.map)
      .bindPopup(label)
      .openPopup();
  }

  updateMarkers() {
    this.markers = Object.keys(this.locations).map((username, id) => ({
      lat: this.locations[username].lat,
      lng: this.locations[username].lng,
      label:
        username === this.current_user
          ? 'My location'
          : username + "'s location",
    }));

    this.markers.map((value) => {
      console.log(value);
      this.addMarker(value, value.label);
    });
  }

  marker() {
    return L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconSize: [32, 32], // size of the icon
      iconAnchor: [16, 32], // point of the icon which will correspond to marker's location
      popupAnchor: [0, -32], // point from which the popup should open relative to the iconAnchor
    });
  }
}
