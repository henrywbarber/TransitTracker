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
                const routesResponse = await axios.get(`http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${EXPO_PUBLIC_CTA_BUS_API_KEY}`)
                console.log("Raw Routes: ", routesResponse.data)
                const routes = routesResponse.data.map(route => ({
                    routeName: route.rtnm,
                    routeNum: rt,
                    dropdownOn: false,
                    directions: [],
                    
                }));

                const directionsAndRoutes = await Promise.all(
                    routes.map(async (route) => {
                        const directionResponse = await axios.get(`http://www.ctabustracker.com/bustime/api/v2/getdirections?key=${EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}`)
                        
                        // route.directions = directionResponse.data.map(direction => ({
                        //     directionName: direction.dir,
                        //     dropdownOn: false,
                        //     stops: [],
                        // }))

                        const directions = await Promise.all(
                            directionResponse.data.map(async (direction) => {
                                const stopsResponse = await axios.get(
                                    `http://www.ctabustracker.com/bustime/api/v2/getstops?key=${EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&dir=${direction.dir}`
                                )

                                return {
                                    dirName: direction.dir,
                                    dropdownOn: false,
                                    stops: stopsResponse.data.map(stop => ({
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
                
            } catch(error){
                console.error('Error fetching bus routes: ',  error)
            } finally{
                setIsLoading(false);
            }
        }
        setBusRoutes(directionsAndRoutes);
        fetchBusRoutes();
    }, []);

    const fetchPredictions = async (routeNum, stop) => {
        //Add logic for fetching predictions and placing into stop.predictions
    }

    const toggleFilterModal = () => {
        setFilterModalVisible(!filterModalVisible)
    }

    const applyFilters = () => {
        console.log("Apply Filters");
    }

    const handleSearch = (text) => {
        setSearch(text);
    };

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
                    </>
                )}
            </View>
            <Modal
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
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f4f4f4',
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
