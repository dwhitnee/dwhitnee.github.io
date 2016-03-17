

//var ec2PricingUrl = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json";

var ec2PricingUrl = "ec2.json";

var productTypes = {};
var instanceTypes = {};
var _instanceData;


function makeUI() {
  populateRegionSelector( Object.keys( instanceTypes ));
}

function populateTable( data ) {
  var table = $("#periodicTable .datatable");
  $("#periodicTable .datatable .dataStart").empty().nextAll().empty();

  var allTypeNames = Object.keys( data ).sort();

  for (var i=0; i < allTypeNames.length; i++) {
    var instanceType = data[allTypeNames[i]];

    var row = $('<div class="row" />');
    row.append( $('<div class="cell" />').text( allTypeNames[i] ));
    row.append( $('<div class="cell" />').text( instanceType.family ));
    row.append( $('<div class="cell" />').text( instanceType.vcpus + " cores"));
    row.append( $('<div class="cell" />').text( instanceType.speed ));
    row.append( $('<div class="cell" />').text( instanceType.memory ));
    row.append( $('<div class="cell" />').text( instanceType.storage ));
    row.append( $('<div class="cell" />').text( instanceType.networkSpeed ));

    var costPerMonth = 0;;
    if (instanceType.price.Linux) {
      costPerMonth = 30 * 24 * instanceType.price.Linux.OnDemand;
    }
    row.append( $('<div class="cell" />').text( "$" + costPerMonth.toFixed(2) + "/mo"));

    if (instanceType.price.Windows) {
      costPerMonth = 30 * 24 * instanceType.price.Windows.OnDemand;
    }
    row.append( $('<div class="cell" />').text( "$" + costPerMonth.toFixed(2) + "/mo"));

    table.append( row );
  }

  table.show();
}

function populateRegionSelector( regions ) {
  var menu = $("#regionSelector");
  for (var i=0; i < regions.length; i++ ) {
    menu.append( $("<option/>").attr( { value: regions[i] }).text( regions[i] ));
  }

  menu.on(
    'change',
    function menuChanged( ev ) {
      var region = ev.target.value;
      populateTable( instanceTypes[region] );
    });

  menu.show();
}


// process the pricing blob, there are 10,000 skus, we need to parse
// out instanceTypes

// productFamilies: "Compute Instance", "IP Address", "Dedicated Host",
// "Data Transfer", "System Operation", "undefined", "Storage",
// "Load Balancer", "NAT Gateway", "Storage Snapshot", "Fee"

function processPricingData( data ) {

  console.log("Got pricing data for " + data.offerCode );

  $.each(
    data.products,
    function( sku, product ) {
      productTypes[product.productFamily] = 1;

      if (product.productFamily === "Compute Instance") {

        var attr = product.attributes;

        instanceTypes[attr.location] = instanceTypes[attr.location] || {};

        // if (attr.instanceType === "c4.4xlarge" &&
        //     attr.location === "US East (N. Virginia)")
        // {
        //   console.log( JSON.stringify( attr ));
        // }

        if (!instanceTypes[attr.location][attr.instanceType]) {
          instanceTypes[attr.location][attr.instanceType] = {
            vcpus:   attr.vcpu,               // cores
            speed:  attr.clockSpeed,         // GHz
            arch:   attr.processorArchitecture, // 32 or 64 bit
            cpu:    attr.physicalProcessor,  // text desc
            memory: attr.memory,
            storage: attr.storage,
            networkSpeed: attr.networkPerformance,
            family: attr.instanceFamily  // optimized for storage, cpu, etc
          };
        }

        // only price out the base installs (skip SQL server, etc)
        if (attr.preInstalledSw === "NA") {
          var os = attr.operatingSystem;   // "Linux"
          var offers = data.terms.OnDemand[sku];
          var only = Object.keys( offers )[0];
          var dimensions = offers[only].priceDimensions;
          only = Object.keys( dimensions )[0];

          instanceTypes[attr.location][attr.instanceType].price =
            instanceTypes[attr.location][attr.instanceType].price || {};

          instanceTypes[attr.location][attr.instanceType].price[os] = {
            OnDemand: dimensions[only].pricePerUnit.USD
          };

          // SKU info
          // tenancy can be shared or dedicated
          // operatingSystem, preInstalledSw, license varies by SKU
        }

      }
    });

  // data.terms.OnDemand[sku][0].priceDimensions[0].pricePerUnit.USD
  // data.terms.Reserved[sku][0-2].priceDimensions[0].pricePerUnit.USD
  //  unit === "Quantity" (up front)
  //  unit === "Hrs"
  //         termAttributes" : {
  //            "LeaseContractLength" : "3yr",
  //            "PurchaseOption" : "Partial Upfront" "All Upfront" "No Upfront"


  //
  // console.log( Object.keys( productTypes ));
  console.log("instance types = " + Object.keys( instanceTypes ).length );
  console.log("regions = " + JSON.stringify( Object.keys( instanceTypes )));

  $(".loading").hide();
  makeUI();
}


$(".loading").show();
$.getJSON( ec2PricingUrl )
 .done( processPricingData )
 .fail( function( error ) {
          alert( JSON.stringify( error ));
        });
