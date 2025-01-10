import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import axios from 'axios';

const TransitTrainScreen = () => {
    const [stations, setStations] = useState([]);

    const fetchStations = async () => {
        try {
            const response = await axios.get('https://data.cityofchicago.org/resource/8pix-ypme.json');
            setStations(response.data);
        } catch (error) {
            console.error('Error fetching stations:', error);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    return (
        <View>
            <FlatList
                data={stations}
                keyExtractor={(item) => item.stop_id}
                renderItem={({ item }) => (
                    <View>
                        <Text>{item.station_name}</Text>
                        <Text>{item.stop_name}</Text>
                    </View>
                )}
            />
        </View>
    );
};

export default TransitTrainScreen;
// import React, { useEffect, useState } from 'react';
// import { View, Text, ScrollView, Picker, ActivityIndicator } from 'react-native';
// import TransitTrainCard from './TransitTrainCard';
// import axios from 'axios';

// const TransitTrainScreen = () => {
//     const [stations, setStations] = useState([]);
//     const [selectedStation, setSelectedStation] = useState(null);
//     const [trainData, setTrainData] = useState([]);
//     const [loading, setLoading] = useState(false);

//     useEffect(() => {
//         // Fetch the list of stations
//         const fetchStations = async () => {
//             try {
//                 // Example fetch for station data (replace with actual station fetching logic)
//                 const response = await axios.get('YOUR_STATION_API_URL');
//                 setStations(response.data.stations); // Assuming response.data.stations contains the station list
//             } catch (error) {
//                 console.error('Error fetching stations:', error);
//             }
//         };

//         fetchStations();
//     }, []);

//     useEffect(() => {
//         if (selectedStation) {
//             // Fetch train data when a station is selected
//             const fetchTrainData = async () => {
//                 setLoading(true);
//                 try {
//                     const response = await axios.get(`http://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=ee9224d87b9349c9a42e0a3977f425e9&mapid=${selectedStation}`);
//                     const parser = new DOMParser();
//                     const xml = parser.parseFromString(response.data, "text/xml");
//                     // Process XML to JSON as required
//                     setTrainData([]); // Replace with actual data processing
//                 } catch (error) {
//                     console.error('Error fetching train data:', error);
//                 } finally {
//                     setLoading(false);
//                 }
//             };

//             fetchTrainData();
//         }
//     }, [selectedStation]);

//     return (
//         <View style={{ flex: 1, padding: 10 }}>
//             <Text>Select a Train Station:</Text>
//             <Picker
//                 selectedValue={selectedStation}
//                 onValueChange={(itemValue) => setSelectedStation(itemValue)}
//             >
//                 {stations.map(station => (
//                     <Picker.Item key={station.mapid} label={station.name} value={station.mapid} />
//                 ))}
//             </Picker>

//             {loading ? (
//                 <ActivityIndicator size="large" color="#0000ff" />
//             ) : (
//                 <ScrollView>
//                     {trainData.map(train => (
//                         <TransitTrainCard key={train.rn} title={`Train to ${train.destNm}`} />
//                     ))}
//                 </ScrollView>
//             )}
//         </View>
//     );
// };

// export default TransitTrainScreen;
