import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import QtQuick.LocalStorage 2.0
import "Timetable.js" as Timetable

ApplicationWindow {
    id:root
    visible: true
    width: 640
    height: 480
    title: qsTr("Hello World")
    property real spacing:10
    signal disable()
    signal enable()

    onDisable: swipeView.enabled=false;
    onEnable: swipeView.enabled=true;

    ListModel
    {
        id: orgModel
    }

    ListModel
    {
        id: busModel
    }

    ListModel
    {
        id:stopModel
    }

    ListModel
    {
        id:timetableModel
    }

    ListModel
    {
        id:routeModel
    }

    SwipeView {
        id: swipeView
        anchors.fill: parent
        currentIndex: 0

        ColumnLayout
        {
            Button
            {
                id:refreshButton
                text: "Обновить"
                onClicked:
                {
                    Timetable.Timetable.getorgs(true);
                    visible=false;
                }
                visible: false
                Layout.fillWidth: true
            }
            ListView
            {
                Layout.fillHeight: true
                Layout.fillWidth: true
                id:orgList
                model: orgModel
                clip: true
                spacing: root.spacing
                delegate: RoundRect{
                    CenterText{text:name}
                    onClicked: {
                        Timetable.GetBuses(index);
                        Timetable.HeaderText[1]=name;
                        swipeView.currentIndex=1;
                    }
                }
            }
        }

        ColumnLayout
        {
            Button
            {
                id:loadAllBusesButton
                text:"Загрузить все автобусы"
                onClicked:
                {
                    Timetable.CurrentOrg().loadAllBuses();
                    visible=false;
                }
                visible:false
                Layout.fillWidth: true
            }

            ListView
            {
                Layout.fillHeight: true
                Layout.fillWidth: true
                id:busList
                model: busModel
                clip:true
                spacing: root.spacing
                delegate: RoundRect{
                    RowLayout
                    {
                        width:parent.pw
                        Item
                        {
                            Layout.maximumWidth: spacing
                            Layout.fillWidth: true
                        }
                        Text{text:number}
                        Item{Layout.fillWidth: true}
                        Text{text:name}
                        Item{Layout.fillWidth: true}
                    }
                    onClicked:{
                        if(Timetable.GetStops(Timetable.Indices[0],index))
                        {
                            Timetable.HeaderText[2]=number+" - "+name;
                            swipeView.currentIndex=2;
                        }
                    }
                }
            }
        }
        ListView
        {
            id:stopList
            model:stopModel
            clip:true
            spacing: root.spacing
            delegate: RoundRect{
                CenterText{text:name+" ("+forward+","+back+")"}
                onClicked:{
                    stationCombo.visible=false;
                    stationCombo.currentIndex=-1;
                    Timetable.CurrentBus().updateTimetable(index);
                    Timetable.HeaderText[3]=Timetable.CurrentBus().number+" - "+name;
                    Timetable.Indices[2]=index;
                    swipeView.currentIndex=3;
                }
            }
        }

        ColumnLayout
        {
            ComboBox
            {
                id:stationCombo
                Layout.fillWidth: true
                model:stopModel
                textRole: "name"
                onCurrentIndexChanged: {
                    if(visible && Timetable.CurrentStop()!==undefined)
                        Timetable.CurrentStop().filterTimetable(Timetable.CurrentBus().stops[currentIndex]);
                }
            }
            ListView
            {
                Layout.fillHeight: true
                Layout.fillWidth: true
                id:timetableList
                clip:true
                model:timetableModel
                spacing: root.spacing
                delegate: RoundRect{
                    GridLayout{
                        columns: 7
                        width:parent.pw
                        Text {
                            text: end
                            Layout.columnSpan: 7
                            Layout.alignment: Qt.AlignHCenter
                        }
                        Item{
                            Layout.maximumWidth: root.spacing
                            Layout.fillWidth: true
                        }
                        Text{text:h+":"+m}
                        Item{Layout.fillWidth: true}
                        Text{text:attrs}
                        Item{Layout.fillWidth: true}
                        Text{text:type}
                        Item{
                            Layout.maximumWidth: root.spacing
                            Layout.fillWidth: true
                        }
                    }
                    onClicked: {
                        Timetable.HeaderText[4]=Timetable.CurrentBus().number+"("+Timetable.CurrentBus().name+") "+attrs+" "+type;
                        if(fwd)
                            Timetable.CurrentBus().routes1[ind].updateModel();
                        else
                            Timetable.CurrentBus().routes2[ind].updateModel();
                        swipeView.currentIndex=4;
                    }
                }
            }
        }
        ListView
        {
            id:routeView
            model:routeModel
            delegate:RoundRect{
                RowLayout{
                    width:routeView.width
                    Item{
                        Layout.maximumWidth: root.spacing
                        Layout.fillWidth: true
                    }
                    Text{text:h+":"+m}
                    Item{Layout.fillWidth: true}
                    Text{text:name}
                    Item{Layout.fillWidth: true}
                }
            }
        }
    }

    header: ToolBar{
            Label{
                text:swipeView.enabled?Timetable.HeaderText[swipeView.currentIndex]:"Загрузка";
            }
            MouseArea
            {
                anchors.fill: parent
                onClicked:{
                    switch(swipeView.currentIndex)
                    {
                    case 0:
                        refreshButton.visible=!refreshButton.visible;
                        break;
                    case 1:
                        loadAllBusesButton.visible=!loadAllBusesButton.visible;
                        break;
                    case 3:
                        stationCombo.visible=!stationCombo.visible;
                        break;
                    }
                }
            }
    }

    Component.onCompleted: Timetable.GetOrgs("http://mostransavto.ru/passengers/routes/raspisaniya/",LocalStorage.openDatabaseSync("MostransavtoDB","1.0","Mostransavto timetable database"))
}
