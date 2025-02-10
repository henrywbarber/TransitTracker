import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    SectionList,
    SafeAreaView,
    StatusBar,
    FlatList,
} from "react-native";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';

function Busses() {
    const [isLoading, setIsLoading] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [busRoutes, setBusRoutes] = useState([]);
    //The expanded elements tell us what is currently dropped down
    const [expandedRoutes, setExpandedRoutes] = useState({});
    const [expandedDirs, setExpandedDirs] = useState({});
    const [expandedStops, setExpandedStops] = useState({});
        // {
        //     routeNum: "123",
        //     routeName: "Downtown Express",
        //     dropdownOn: false, 
        //     directions: [
        //         {
        //        
        //             dirName: "Northbound",
        //             dropdownOn: false,
        //             stops: [
        //                 {
        //                     stopId: "1234",
        //                     stopName: "Main St Station",
        //                     dropdownOn: false,
        //                     predictions: []
        //                 },
        //                 // ... more stops
        //             ]
        //         },
        //         // ... other direction
        //     ]
        // }

    useEffect(() => {
        const fetchBusRoutes = async () => {
            setIsLoading(true);
            try{
                const routesResponse = await axios.get(`http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&format=json`)
                
                //console.log('Raw API Response:', routesResponse); // Log the full response
                //console.log('Response Data:', routesResponse.data["bustime-response"]); // Log just the data
                const routes = routesResponse.data["bustime-response"].routes.map(route => ({
                    routeName: route.rtnm,
                    routeNum: route.rt,
                    dropdownOn: false,
                    directions: [],
                    
                }));

                const directionsAndRoutes = await Promise.all(
                    routes.map(async (route) => {
                        const directionResponse = await axios.get(`http://www.ctabustracker.com/bustime/api/v2/getdirections?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&format=json`)
                        
                        // route.directions = directionResponse.data.map(direction => ({
                        //     directionName: direction.dir,
                        //     dropdownOn: false,
                        //     stops: [],
                        // }))

                        const directions = await Promise.all(
                            directionResponse.data["bustime-response"].directions.map(async (direction) => {
                                const stopsResponse = await axios.get(
                                    `http://www.ctabustracker.com/bustime/api/v2/getstops?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&dir=${direction.dir}&format=json`
                                )
                                //console.log(stopsResponse.data["bustime-response"])
                                return {
                                    dirName: direction.dir,
                                    dropdownOn: false,
                                    stops: stopsResponse.data["bustime-response"].stops.map(stop => ({
                                        stopId: stop.stpid,
                                        stopName: stop.stpnm,
                                        latitude: stop.lat,
                                        longitude: stop.lon,
                                        predictions: [],
                                        dropdownOn: false                                      
                                    }))
                                }
                            })
                        )
                        return{
                            ...route,
                            directions: directions
                        }
                    })
                )
                //console.log(directionsAndRoutes)
                setBusRoutes(directionsAndRoutes);
            } catch(error){
                console.error('Error fetching bus routes: ',  error)
            } finally{
                setIsLoading(false);
                //console.log(busRoutes)
            }
        }
        
        fetchBusRoutes();
       
    }, []);

    // useEffect(() => {
    //     busRoutes.map(route => console.log("Stop", route.directions.stops))
    //   }, [busRoutes]);

    const fetchPredictions = async (routeNum, stop) => {
        //console.log(stop.stopId)
        //Add logic for fetching predictions and placing into stop.predictions
        try{
            const predResponse = await axios.get(
                `http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNum}&stpid=${stop.stopId}&format=json`)
            //console.log(predResponse.data)
            const predictions = predResponse.data["bustime-response"].prd ? predResponse.data["bustime-response"].prd.map(pred =>({
                direction: pred.rtdir,
                type: pred.typ,
                predictedTime: pred.prdtm,
                delay: pred.dly,
                timeInMinutes: pred.prdctdn,
                destination: pred.des
            }))
            :
            [];

            setBusRoutes(prevRoutes => {
                return prevRoutes.map(route => {
                    if(route.routeNum === routeNum){
                        return {
                            ...route,
                            directions: route.directions.map(dir => ({
                                ...dir,
                                stops: dir.stops.map(s =>
                                    s.stopId === stop.stopId ? {...s, predictions} : s
                                )
                            }))
                        }
                    }
                    return route;
                })
            })
        } catch(e){
            console.error('Error fetching predictions: ', e)
            setBusRoutes(prevRoutes => {
                return prevRoutes.map(route => {
                    if (route.routeNum === routeNum) {
                        return {
                            ...route,
                            directions: route.directions.map(dir => ({
                                ...dir,
                                stops: dir.stops.map(s => 
                                    s.stopId === stop.stopId 
                                        ? { ...s, predictions: [], error: 'Failed to load predictions' }
                                        : s
                                )
                            }))
                        };
                    }
                    return route;
                });
            });
        }
    }

    const toggleFilterModal = () => {
        setFilterModalVisible(!filterModalVisible)
    }

    const getFormattedTime = (time) => {
        const [, hoursMins] = time.split(" ");
        if (!hoursMins) {
            throw new Error("xpected 'YYYYMMDD HH:MM'");
        }

        const [hourStr, minutes] = hoursMins.split(":");
        let hours = parseInt(hourStr, 10);
        const period = hours >= 12 ? "PM" : "AM";

        hours = hours % 12 || 12;

        return `${hours}:${minutes} ${period}`
    }

    const applyFilters = () => {
        console.log("Apply Filters");
    }

    const handleSearch = (text) => {
        setSearch(text);
    };

    const toggleExpand = (type, key) => {

        //TODO: Make it so closing a route dropdown will also close it's sub directions and sub stops
        switch (type){
            case 'route':
                setExpandedRoutes(prev => ({...prev, [key]: !prev[key]}));
                break;
            case 'direction':
                setExpandedDirs(prev => ({...prev, [key]: !prev[key]}));
                break;
            case 'stop':
                setExpandedStops(prev => ({...prev, [key]: !prev[key]}));
                break;
        }
    };

    const renderPredictions = (predictions) => (
        predictions && predictions.length > 0 ? (
            <View style={styles.tableContainer}>
                <View style={styles.tableRow}>
                    <View styles={[styles.tableCell, styles.tableHeader, {flex:2}]}>
                        <Text style={styles.tableHeaderText}>Destination</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableHeader, { flex: 1 }]}>
                        <Text style={styles.tableHeaderText}>Time</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableHeader, { flex: 1 }]}>
                        <Text style={styles.tableHeaderText}>Type</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableHeader, { flex: 1 }]}>
                        <Text style={styles.tableHeaderText}>Status</Text>
                    </View>
                </View>
            

            {predictions.map((p, index) => (
                <View key={index} style={[styles.tableRow]}>
                    <View style={[styles.tableCell, {flex: 2}]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{p.destination}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableCellText}>{getFormattedTime(p.predictedTime)}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableCellText}>{p.type === 'A' ? 'Arrival' : 'Departure'}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={[styles.tableCellText, p.delay ? styles.delayedText : styles.onTimeText]}>
                            {p.delay ? 'Delayed' : 'On Time'}
                        </Text>
                    </View>
                </View>
            ))}
            </View>
        ) : (
            <View style={styles.noPredictionsContainer}>
                <Text style={styles.noPredictions}>No Predictions Available</Text>
            </View>
        )
    )

    const renderRoutes = ({ item: route }) => (
        <View >
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={()=> toggleExpand('route', route.routeNum)}
            >
                <Text style={{fontWeight: 'bold', fontSize: '16'}}>
                    {route.routeNum} - {route.routeName}
                </Text>
                <Ionicons
                    name ={expandedRoutes[route.routeNum] ? 'chevron-down' : 'chevron-forward'}
                    size={24}
                />
            </TouchableOpacity>

            {expandedRoutes[route.routeNum] && route.directions.map(direction => (
                <View key={direction.dirName} style={{paddingLeft:'15'}}>
                    <TouchableOpacity
                        style={styles.directionHeader}
                        onPress={()=> toggleExpand('direction', `${route.routeNum}-${direction.dirName}`)}
                    >
                        <Text style={{fontSize:'14', fontWeight: 'bold'}}>{direction.dirName}</Text>
                        <Ionicons
                            name={expandedDirs[`${route.routeNum}-${direction.dirName}`] ? 'chevron-down': 'chevron-forward'}
                            size={20}
                        />
                    </TouchableOpacity>

                    {expandedDirs[`${route.routeNum}-${direction.dirName}`] && 
                        direction.stops.map(stop => (
                            <View key={stop.stopId} style={{paddingLeft:'30'}}>
                                <TouchableOpacity
                                    style={styles.stopHeader}
                                    onPress={()=>{
                                        toggleExpand('stop', `${route.routeNum}-${direction.dirName}-${stop.stopId}`)
                                        fetchPredictions(route.routeNum, stop);
                                    }}
                                >
                                    <Text style={{fontSize:'12'}}>{stop.stopName}</Text>
                                    <Ionicons
                                        name={expandedStops[`${route.routeNum}-${direction.dirName}-${stop.stopId}`] ? 
                                            'chevron-down' : 'chevron-forward'}
                                        size={18}
                                    />
                                </TouchableOpacity>

                                {expandedStops[`${route.routeNum}-${direction.dirName}-${stop.stopId}`] && (
                                    <View style={styles.predictionsContainer}>
                                        {renderPredictions(stop.predictions)}
                                    </View>
                                )}
                            </View>
                        ))
                    }
                    </View>
            ))}
        </View>
    );

    
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.container}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading Bus Routes...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Bus Routes</Text>
                            <TouchableOpacity style={styles.filterButton} onPress={toggleFilterModal}>
                                <Ionicons name="filter" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchBar}
                                placeholder="Search by Bus"
                                value={search}
                                onChangeText={handleSearch}
                                clearButtonMode="always"
                                autoComplete=""
                            />
                        </View>
                        <FlatList
                            data={busRoutes}
                            renderItem={renderRoutes}
                            keyExtractor={(route) => route.routeNum}
                            style={{backgroundColor:'#f4f4f4'}}
                        />
                    </>
                )}
            </View>
            {/*<Modal
            animationType="slide"
            transparent={true}
            visible={filterModalVisible}
            onRequestClose={toggleFilterModal}
            >
                <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Filter Routes</Text>
                    <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalButton} onPress={applyFilters}>
                        <Text style={styles.modalButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={toggleFilterModal}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                </View>
            </Modal>*/}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    tableContainer: {
        backgroundColor: "#fff",
        overflow: "hidden",
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        padding: 12,
        justifyContent: 'center',
    },
    tableHeader: {
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 2,
        borderBottomColor: "#dee2e6",
        paddingTop: 12,
    },
    tableHeaderText: {
        fontWeight: 'bold',
        color: '#495057',
        fontSize: 14,
    },
    tableCellText: {
        fontSize: 14,
        color: '#212529',
        flexShrink: 1,
    },
    delayedText: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
    onTimeText: {
        color: '#28a745',
        fontWeight: 'bold',
    },
    noPredictionsContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginTop: 8,
        alignItems: 'center',
    },
    noPredictions: {
        color: '#6c757d',
        fontSize: 14,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    predictionsContainer: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: "hidden",
        marginBottom: 16,
        
    },
    stopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 0, // Changed from 8 to 0 to connect with table
        borderLeftWidth: 6,
        borderLeftColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    directionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    routeContainer: {
        backgroundColor: 'white',
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        height: 40,
        fontSize: 16,
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        maxHeight: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    suggestionText: {
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    boldText: {
        fontWeight: "bold",
    },
    filterButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
    },
    clearFiltersButton: {
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    clearFiltersText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    filterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    filterItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#ff4444',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        color: '#666',
    },
});

export default Busses;
