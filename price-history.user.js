// ==UserScript==
// @name         DLSite Price History
// @namespace    V.L
// @version      0.1.0
// @description  Remembers and displays the prices you have seen for listings.
// @author       Valerio Lyndon
// @match        https://www.dlsite.com/*
// @run-at       document-start
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.addStyle
// @licence      MIT
// ==/UserScript==

GM.addStyle(`
.vl-phist {
	max-width: 200px;
	padding: 0 6px;
	border-radius: 2px;
	color: #fff;
	font-size: 11px;
	font-weight: bold;
	line-height: 17px;
	vertical-align: middle;
	box-sizing: border-box;
	text-align: center;
	text-transform: uppercase;
}
.vl-phist.best {
	background: #68e;
}
.vl-phist.worse {
	background: #e69;
}
.cp_work_deals .vl-phist {
	display: inline-block;
	width: 49%;
}
.search_result_img_box_inner .vl-phist {
	margin-top: 5px;
}
`);

class PriceHistory {
	constructor( parent ){
		this.parent = parent || document;
		this.processWorkPage();
		this.processCarousel();
		this.processGrid();
		this.processRecommended();
		this.processFavourites();
	}

	async comparePrice( RJ, currentPrice ){
		let previousBest = await GM.getValue(RJ, -1);
		let best = previousBest;
		if( previousBest < 0 || previousBest > currentPrice ){
			GM.setValue(RJ, currentPrice);
			best = currentPrice;
		}
		return best;
	}

	async insertVisual( currentPrice, lowestPrice, marker, placement = 'afterend' ){
		let alert = document.createElement('div');
		alert.className = 'vl-phist';
		if( lowestPrice >= currentPrice ){
			alert.classList.add('best');
			alert.textContent = `Best price!`;
		}
		if( lowestPrice < currentPrice ){
			alert.classList.add('worse');
			alert.textContent = `Best: ${lowestPrice} JPY`;
		}
		marker.insertAdjacentElement(placement, alert);
	}

	async processWorkPage( ){
		const item = this.parent.querySelector('#work_buy_box_wrapper');
		if( !item ){
			return;
		}

		const RJ = item.dataset.productId;
		if( !RJ ){
			console.log('failed to read RJ number: ', item);
			return;
		}

		let currentPrice = item.querySelector('.work_buy_content .price')?.firstChild?.textContent;
		if( currentPrice === undefined ){
			console.log('failed to read price of '+RJ);
			return;
		}
		currentPrice = parseInt(currentPrice.replaceAll(/\D+/g, ''));

		const lowestPrice = await this.comparePrice(RJ, currentPrice);

		// janky timeout because DLSite removes and replaces some of the children here and I can't be fucked to write a mutation observer for this
		setTimeout(()=>{
			const marker = item.querySelector('.work_buy_body:has(.price)');
			this.insertVisual( currentPrice, lowestPrice, marker );
		}, 300);
	}

	async processCarousel( ){
		const listings = this.parent.querySelectorAll('.cp_work_item');
		for( let item of listings ){
			const RJ = item.dataset.workno;
			if( !RJ ){
				console.log('failed to read RJ number: ', item);
				continue;
			}

			let currentPrice = item.querySelector('.cp_work_price')?.firstChild?.textContent;
			if( currentPrice === undefined ){
				console.log('failed to read price of '+RJ);
				continue;
			}
			currentPrice = parseInt(currentPrice.replaceAll(/\D+/g, ''));

			const lowestPrice = await this.comparePrice(RJ, currentPrice);

			const marker = item.querySelector('.cp_work_deals span:last-of-type') || item.querySelector('.cp_work_value');
			this.insertVisual( currentPrice, lowestPrice, marker );
		}
	}

	async processGrid( ){
		const listings = this.parent.querySelectorAll('.search_result_img_box_inner');
		for( let item of listings ){
			let RJ = item.getElementsByTagName('dt')?.[0]?.id;
			RJ = typeof RJ === 'string' ? RJ.substring(6) : undefined;
			if( !RJ ){
				console.log('failed to read RJ number: ', item);
				continue;
			}

			let currentPrice = item.querySelector('.work_price')?.firstChild?.textContent;
			if( currentPrice === undefined ){
				console.log('failed to read price of '+RJ);
				continue;
			}
			currentPrice = parseInt(currentPrice.replaceAll(/\D+/g, ''));

			const lowestPrice = await this.comparePrice(RJ, currentPrice);

			const marker = item.querySelector('.work_deals');
			this.insertVisual( currentPrice, lowestPrice, marker );
		}
	}

	async processRecommended( ){
		const listings = this.parent.querySelectorAll('.recommend_list .swiper-slide');
		for( let item of listings ){
			const RJ = item.dataset.prod;
			if( !RJ ){
				console.log('failed to read RJ number: ', item);
				continue;
			}

			let currentPrice = item.querySelector('.work_price')?.firstChild?.textContent;
			if( currentPrice === undefined ){
				console.log('failed to read price of '+RJ);
				continue;
			}
			currentPrice = parseInt(currentPrice.replaceAll(/\D+/g, ''));

			const lowestPrice = await this.comparePrice(RJ, currentPrice);

			const marker = item.querySelector('.recommend_work_item div:nth-last-of-type(2)');
			this.insertVisual( currentPrice, lowestPrice, marker );
		}
	}

	async processFavourites( ){
		const listings = this.parent.querySelectorAll('._favorite_item');
		for( let item of listings ){
			let RJ = item.querySelector('.work_thumb a')?.id;
			RJ = typeof RJ === 'string' ? RJ.substring(6) : undefined;
			if( !RJ ){
				console.log('failed to read RJ number: ', item);
				continue;
			}

			let currentPrice = item.querySelector('.work_price')?.firstChild?.textContent;
			if( currentPrice === undefined ){
				console.log('failed to read price of '+RJ);
				continue;
			}
			currentPrice = parseInt(currentPrice.replaceAll(/\D+/g, ''));

			const lowestPrice = await this.comparePrice(RJ, currentPrice);

			const marker = item.querySelector('.work_price_wrap');
			this.insertVisual( currentPrice, lowestPrice, marker );
		}
	}
}

document.addEventListener('DOMContentLoaded', ()=>{
	new PriceHistory();

	document.querySelectorAll('.recommend_list').forEach((targetNode)=>{
		const observer = new MutationObserver((mutationsList, observer)=>{
			new PriceHistory(targetNode);
			observer.disconnect();
		});
		observer.observe(targetNode, { childList: true });
	});
});

